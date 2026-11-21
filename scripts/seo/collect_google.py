#!/usr/bin/env python3
"""Read one verified website's Google analytics; emit aggregate JSON to stdout.

Requires existing Application Default Credentials and google-auth[requests].
Never starts authentication, adds scopes, changes settings, or writes files.
GA4 sessions are not Search Console clicks; store clicks are not installs.
"""

import argparse
import datetime as dt
import json
import math
import re
import sys
from urllib.parse import quote, urlparse
from zoneinfo import ZoneInfo


SCHEMA_VERSION = "1.0"
JST = ZoneInfo("Asia/Tokyo")
TIMEOUT = 25
METRICS = ["sessions", "activeUsers", "totalUsers", "screenPageViews",
           "engagedSessions", "engagementRate", "keyEvents"]
STORES = ["apps.apple.com", "play.google.com"]
ANALYTICS_READONLY_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"


def unavailable(code, http_status=None):
    result = {"status": "unavailable", "error": {"code": code}}
    if http_status is not None:
        result["error"]["http_status"] = http_status
    return result


class GoogleReader:
    """All URLs are fixed Google API origins. No credential material is logged."""

    def __init__(self):
        import google.auth
        from google.auth.transport.requests import AuthorizedSession

        # Reuse exactly the read-only scope of the existing, already authorized
        # local collector. This does not alter ADC or start an authorization
        # flow. In particular, never add a Search Console/webmasters scope.
        credentials, _ = google.auth.default(scopes=[ANALYTICS_READONLY_SCOPE])
        self.session = AuthorizedSession(credentials)

    def request(self, method, url, body=None):
        try:
            response = self.session.request(method, url, json=body, timeout=TIMEOUT)
        except Exception as exc:
            code = {"RefreshError": "EXISTING_ADC_REFRESH_FAILED",
                    "DefaultCredentialsError": "EXISTING_ADC_UNAVAILABLE",
                    "TransportError": "TRANSPORT_ERROR",
                    "Timeout": "REQUEST_TIMEOUT",
                    "ReadTimeout": "REQUEST_TIMEOUT",
                    "ConnectionError": "CONNECTION_ERROR"}.get(type(exc).__name__, "AUTHENTICATION_OR_TRANSPORT_ERROR")
            return unavailable(code)
        try:
            data = response.json()
        except (ValueError, TypeError):
            return unavailable("INVALID_JSON_RESPONSE", response.status_code)
        if not response.ok:
            error = data.get("error", {}) if isinstance(data, dict) else {}
            code = error.get("status", "GOOGLE_API_ERROR")
            if not isinstance(code, str) or not re.fullmatch(r"[A-Z_]{1,64}", code):
                code = "GOOGLE_API_ERROR"
            # Recognize scope refusal, but never print a provider message, token,
            # credential path, response headers, or credential details.
            if "insufficient authentication scopes" in str(error.get("message", "")).lower():
                code = "INSUFFICIENT_AUTHENTICATION_SCOPES"
            return unavailable(code, response.status_code)
        if not isinstance(data, dict):
            return unavailable("UNEXPECTED_RESPONSE_SHAPE", response.status_code)
        return {"status": "ok", "data": data}

    def ga_report(self, prop, dimensions, metrics, ranges, dimension_filter, limit=100):
        result = self.request("POST", f"https://analyticsdata.googleapis.com/v1beta/properties/{prop}:runReport", {
            "dateRanges": ranges,
            "dimensions": [{"name": item} for item in dimensions],
            "metrics": [{"name": item} for item in metrics],
            "dimensionFilter": dimension_filter,
            "orderBys": [{"metric": {"metricName": metrics[0]}, "desc": True}],
            "limit": limit,
            "keepEmptyRows": False,
        })
        if result["status"] != "ok":
            return result
        data = result["data"]
        dimensions = [item["name"] for item in data.get("dimensionHeaders", [])]
        headers = data.get("metricHeaders", [])
        rows = []
        try:
            for row in data.get("rows", []):
                item = dict(zip(dimensions, [x["value"] for x in row.get("dimensionValues", [])]))
                for header, value in zip(headers, row.get("metricValues", [])):
                    raw = value["value"]
                    number = int(raw) if header.get("type") == "TYPE_INTEGER" else float(raw)
                    if not math.isfinite(number):
                        raise ValueError("non-finite metric")
                    item[header["name"]] = number
                rows.append(item)
        except (KeyError, TypeError, ValueError):
            return unavailable("INVALID_REPORT_VALUES")
        metadata = data.get("metadata", {})
        # Avoid retaining arbitrary metadata or quota/account identifiers.
        safe_metadata = {k: metadata[k] for k in (
            "timeZone", "subjectToThresholding", "dataLossFromOtherRow",
            "samplingMetadatas", "emptyReason") if k in metadata}
        return {
            "status": "ok" if rows else "no_reported_data",
            "rows": rows,
            "reported_dimension_row_count": data.get("rowCount", 0),
            "requested_limit": limit,
            "truncated_to_requested_limit": data.get("rowCount", 0) > limit,
            "date_ranges": ranges,
            "metadata": safe_metadata,
        }


def exact(field, value):
    return {"filter": {"fieldName": field, "stringFilter": {
        "matchType": "EXACT", "value": value, "caseSensitive": False}}}


def all_of(*expressions):
    return {"andGroup": {"expressions": list(expressions)}}


def date_ranges(end):
    return [
        {"name": "recent_7d", "startDate": (end - dt.timedelta(days=6)).isoformat(), "endDate": end.isoformat()},
        {"name": "prior_7d", "startDate": (end - dt.timedelta(days=13)).isoformat(), "endDate": (end - dt.timedelta(days=7)).isoformat()},
        {"name": "last_90d", "startDate": (end - dt.timedelta(days=89)).isoformat(), "endDate": end.isoformat()},
    ]


def collect_ga4(reader, prop, hostname, ranges):
    admin = f"https://analyticsadmin.googleapis.com/v1beta/properties/{prop}"
    property_result = reader.request("GET", admin)
    if property_result["status"] != "ok":
        return property_result
    stream_result = reader.request("GET", admin + "/dataStreams")
    if stream_result["status"] != "ok":
        return stream_result
    if stream_result["data"].get("nextPageToken"):
        return unavailable("STREAM_LIST_INCOMPLETE")
    matching = [stream for stream in stream_result["data"].get("dataStreams", [])
                if stream.get("type") == "WEB_DATA_STREAM"
                and urlparse(stream.get("webStreamData", {}).get("defaultUri", "")).hostname == hostname]
    if not matching:
        return unavailable("WEBSITE_STREAM_HOSTNAME_MISMATCH")
    stream_ids = [stream["name"].rsplit("/", 1)[-1] for stream in matching]
    stream_filter = {"filter": {"fieldName": "streamId", "inListFilter": {"values": stream_ids}}}
    verified = {
        "property_id": prop,
        "hostname": hostname,
        "property_time_zone": property_result["data"].get("timeZone"),
        "matching_web_stream_ids": stream_ids,
        "stream_url_match": True,
    }
    # Verify observed traffic before collecting this site's metrics. Do not
    # expose names or metrics for other hosts, even inside the chosen stream.
    observed = reader.ga_report(prop, ["hostName"], ["sessions"], [ranges[2]], stream_filter, 1000)
    if observed["status"] not in ("ok", "no_reported_data"):
        return {**observed, "verification": verified}
    observed_hosts = {row["hostName"].lower() for row in observed["rows"]}
    verified["observed_hostname_match"] = hostname in observed_hosts
    if hostname not in observed_hosts:
        return {"status": "no_reported_data" if not observed_hosts else "unavailable",
                "error": {"code": "TARGET_HOSTNAME_NOT_OBSERVED"}, "verification": verified}

    base_filter = all_of(stream_filter, exact("hostName", hostname))
    organic_filter = all_of(base_filter, exact("sessionDefaultChannelGroup", "Organic Search"))
    reports = {
        "totals": reader.ga_report(prop, [], METRICS, ranges, base_filter),
        "channels": reader.ga_report(prop, ["sessionDefaultChannelGroup"],
                                     ["sessions", "activeUsers", "screenPageViews", "engagedSessions"],
                                     ranges, base_filter),
        "organic_totals": reader.ga_report(prop, [], METRICS, ranges, organic_filter),
    }
    # Separate requests ensure a true top 10 for EACH date range. A multi-range
    # limit can select a common set of dimension values, rather than each top 10.
    reports["organic_landing_pages_top10"] = {
        period["name"]: reader.ga_report(prop, ["landingPage"],
                                         ["sessions", "activeUsers", "screenPageViews", "engagedSessions"],
                                         [period], organic_filter, 10)
        for period in ranges
    }
    reports["organic_store_outbound_clicks"] = reader.ga_report(
        prop, ["linkDomain"], ["eventCount", "totalUsers"], ranges,
        all_of(organic_filter, exact("eventName", "click"),
               {"filter": {"fieldName": "linkDomain", "inListFilter": {"values": STORES}}}), 10)
    key_events = reader.request("GET", admin + "/keyEvents")
    if key_events["status"] == "ok":
        key_events = {"status": "ok", "registered_event_names": [
            event.get("eventName") for event in key_events["data"].get("keyEvents", [])],
            "complete": not bool(key_events["data"].get("nextPageToken"))}
    reports["key_event_configuration"] = key_events
    failures = [name for name, report in reports.items()
                if name != "organic_landing_pages_top10" and report.get("status") == "unavailable"]
    failures += [f"organic_landing_pages_top10.{name}" for name, report in
                 reports["organic_landing_pages_top10"].items() if report.get("status") == "unavailable"]
    return {"status": "partial" if failures else "ok", "verification": verified,
            "unavailable_reports": failures, "reports": reports}


def collect_search_console(reader, site, hostname, ranges):
    if not site:
        return {"status": "not_configured", "reason": "SEARCH_CONSOLE_SITE_NOT_SPECIFIED"}
    # Check only the explicitly named property, not the user's entire site list.
    base = "https://www.googleapis.com/webmasters/v3/sites/" + quote(site, safe="")
    access = reader.request("GET", base)
    if access["status"] != "ok":
        return access
    if access["data"].get("siteUrl") != site:
        return unavailable("SEARCH_CONSOLE_PROPERTY_MISMATCH")
    reports = {}
    for period in ranges:
        result = reader.request("POST", base + "/searchAnalytics/query", {
            "startDate": period["startDate"], "endDate": period["endDate"],
            "type": "web", "dataState": "final", "rowLimit": 1,
            "dimensionFilterGroups": [{"groupType": "and", "filters": [{
                "dimension": "page", "operator": "includingRegex",
                "expression": "^https?://" + re.escape(hostname) + "(/|$)",
            }]}],
        })
        if result["status"] != "ok":
            reports[period["name"]] = result
            # A refusal applies to the next range too. Stop; do not try to
            # acquire a different token or broaden this credential's scopes.
            break
        rows = [{key: row[key] for key in ("clicks", "impressions", "ctr", "position") if key in row}
                for row in result["data"].get("rows", [])]
        reports[period["name"]] = {"status": "ok" if rows else "no_reported_data",
                                   "date_range": period, "rows": rows,
                                   "aggregation_type": result["data"].get("responseAggregationType")}
    complete = len(reports) == len(ranges) and all(r["status"] != "unavailable" for r in reports.values())
    return {"status": "ok" if complete else "partial", "site": site,
            "search_type": "web", "data_state": "final", "reports": reports,
            "hostname_filter": hostname, "reporting_time_zone": "America/Los_Angeles",
            "note": "Page-filtered Search Console aggregates use its reporting timezone; do not equate them with property-wide totals or GA4 sessions."}


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--property-id", required=True, help="One numeric GA4 property ID")
    parser.add_argument("--hostname", required=True, help="Exact bare hostname, for example trailfusionai.com")
    parser.add_argument("--end-date", type=dt.date.fromisoformat,
                        help="Inclusive YYYY-MM-DD; default is today's JST date minus three days")
    parser.add_argument("--search-console-site", help="Optional exact authorized Search Console property, on the same hostname")
    args = parser.parse_args(argv)
    if not re.fullmatch(r"[0-9]+", args.property_id):
        parser.error("--property-id must be numeric")
    args.hostname = args.hostname.lower().rstrip(".")
    if not re.fullmatch(r"(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", args.hostname) or ".." in args.hostname:
        parser.error("--hostname must be a bare ASCII hostname")
    today = dt.datetime.now(JST).date()
    args.end_date = args.end_date or today - dt.timedelta(days=3)
    if args.end_date > today:
        parser.error("--end-date cannot be in the future")
    if args.search_console_site:
        site = args.search_console_site
        if site.startswith("sc-domain:"):
            match = site[len("sc-domain:"):] == args.hostname
        else:
            parsed = urlparse(site)
            match = parsed.scheme in ("https", "http") and parsed.hostname == args.hostname and not parsed.username and not parsed.password
        if not match:
            parser.error("--search-console-site must match --hostname exactly")
    return args


def main(argv=None):
    args = parse_args(argv)
    ranges = date_ranges(args.end_date)
    output = {
        "schema_version": SCHEMA_VERSION,
        "retrieved_at": dt.datetime.now(JST).isoformat(),
        "source": "Google Analytics Admin/Data APIs; optional Search Console API",
        "date_ranges": ranges,
        "notes": [
            "Existing ADC only; no login, new scopes, settings changes, or file writes.",
            "GA4 data may be revised after collection; the default date lag is three days.",
            "Users are independently aggregated per period and dimension; do not sum users across dates, channels, or pages.",
            "Sessions and channel/page splits may differ; use totals from the independent aggregate report.",
            "GA4 organic sessions are not Search Console clicks, impressions, CTR, or rankings.",
            "Outbound store clicks are events, not downloads, installs, purchases, or unique people.",
            "Empty or unavailable reports are not zero; the API must actually return a zero before it is reported as zero.",
            "Landing-page paths exclude query strings. Top 10 rows are a sample, not a complete site inventory.",
        ],
    }
    try:
        reader = GoogleReader()
    except Exception:
        output["ga4"] = unavailable("EXISTING_ADC_OR_DEPENDENCY_UNAVAILABLE")
        output["search_console"] = unavailable("EXISTING_ADC_OR_DEPENDENCY_UNAVAILABLE")
    else:
        try:
            output["ga4"] = collect_ga4(reader, args.property_id, args.hostname, ranges)
        except Exception:
            output["ga4"] = unavailable("COLLECTION_FAILED")
        try:
            output["search_console"] = collect_search_console(reader, args.search_console_site, args.hostname, ranges)
        except Exception:
            output["search_console"] = unavailable("COLLECTION_FAILED")
    print(json.dumps(output, ensure_ascii=False, indent=2, allow_nan=False))
    return 0 if output["ga4"].get("status") in ("ok", "partial", "no_reported_data") else 1


if __name__ == "__main__":
    sys.exit(main())
