# バックエンド仕様書

## 概要

APIエンドポイントとDBを提供する

## 構成

必要とされる可用性(整合性含め)が低いのでシンプルな構成で良い

- Cloudflare Workers
- Cloudflare Workers KV

ただし、Cloudflare Workers KVは1000書き込み/日の制限があるため微妙なライン  
DynamoDB等も選択肢に入れておく

## APIエンドポイント

- `/rooms`: 教室の一覧
  - GET : 教室の一覧を取得
    - レスポンス
      - ボディ
        - `rooms`: 教室データのリスト
          - `room_id`: 教室ID
          - `name`: 教室名
          - `description`: 教室の説明
          - `floor`: 教室の階数
- `/crowd`: 混雑状況
  - HEAD: 全教室の混雑状況の更新状況の確認
    - レスポンス
      - ヘッダー
        - `Last-Modified`: 最終更新日時
  - GET : 全教室の混雑状況を取得
    - レスポンス
      - ボディ
        - `crowd`: 混雑状況データのリスト
          - `room_id`: 教室ID
          - `status`: 混雑状況(number)
          - `updated_at`: 更新日時
- `/crowd/:room_id`: 特定教室の混雑状況
  - HEAD: 特定教室の混雑状況の更新状況の確認
    - レスポンス
      - ヘッダー
        - `Last-Modified`: 最終更新日時
  - GET : 特定教室の混雑状況を取得
    - レスポンス
      - ボディ
        - `status`: 混雑状況(number)
        - `updated_at`: 更新日時
  - PUT : 混雑状況を更新
    - リクエスト
      - ボディ
        - `status`: 混雑状況(number)

## データストア

room_id : [ 教室名 , 教室の説明 , 階数 ]
room_id : [ 混雑状況 , 更新日時 ]

これだけで良い
