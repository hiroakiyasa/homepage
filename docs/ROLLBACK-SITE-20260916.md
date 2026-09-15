# 復元手順

## 保存済みの改修前状態
- Backup branch: `backup/pre-site-restructure-20260915`
- Commit: `b8c922f00f90f1e443b02253dd78d5f60b2de53d`

masterへの公開は改修内容を一つにまとめたコミットで行います。公開コミットを取り消すと、元のページ内容へ戻り、旧自動上書き処理の停止は維持されます。公開コミットを取り消す場合は、履歴を書き換えるforce pushではなく、次の方法を使用してください。

```sh
git fetch origin
git switch master
git pull --ff-only origin master
git revert <この改修の公開コミットSHA>
git push origin master
```

公開後に追加変更がある場合は、競合内容を確認してからrevertを完了してください。バックアップブランチは改修しないでください。ローカルの整備記録はGit管理の対象ではありません。ブラウザの記録書き出しで別途バックアップしてください。
