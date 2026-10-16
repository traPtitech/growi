# traQ認証

traQ専用のOIDC認証。設定は環境変数のみで管理する。設定変更後はGROWIを再起動する。

| 環境変数 | 内容 |
| --- | --- |
| `TRAQ_ENABLED` | `true` で有効。未指定時は無効 |
| `TRAQ_CLIENT_ID` | OAuthクライアントのClient ID。認証を有効にする場合は必須 |
| `TRAQ_CLIENT_SECRET` | OAuthクライアントのSecret。認証を有効にする場合は必須 |
| `TRAQ_ISSUER_HOST` | IssuerのURL。認証を有効にする場合は必須。例: `https://q.trap.jp` |

OAuthクライアントのリダイレクトURIは、GROWIのSite URLに `/passport/traq/callback` を付けたURL。スコープは `openid profile`、IDトークンの署名方式はES256。

開発時は `apps/app/.env.development.local` に設定する。本番ではデプロイ先の環境変数またはSecret管理機能を使う。認証情報をgitに追加しないこと。

設定が揃い、認証の初期化が成功すると、未ログイン時の `/login` からtraQへ自動転送する。認証失敗時はログイン画面にエラーを表示する。

アイコンは `picture` 属性から同期する。新規ユーザーのメールアドレスには `{username}@trap.invalid` を使用する。

traQのユーザー名を変更しない運用を前提に、同名の既存ユーザーへ常に紐付ける。移行前に、既存ユーザー名とtraQユーザー名の対応を確認すること。既存ユーザーに紐付く場合は、元のID・メールアドレス・管理者権限を保持する。

旧 `security:passport-traq:*` のDB設定は参照しない。既存のtraQ外部アカウントとの紐付けはそのまま利用する。
