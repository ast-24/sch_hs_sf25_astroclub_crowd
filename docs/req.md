# 要件定義書

## 機能要件

天文部が出展する各教室の混雑状況を管理する  
来訪者向けに表示し、入力も来訪者が行う

### 対象教室リスト

- 3F 暗室
- 3F 地学実験室
- 3F 物理実験室
- 3F S33
- 2F 情報教室3
- RF ドーム

### 入力ページ

教室と混雑状況を選択し送信

混雑状況(空き具合)は◎○△くらいでいい  
もしくは数値で入力か

特定の教室のみを表示するページ(設置用)も必要

### 表示ページ

#### リスト表示案

|     教室      | 混雑状況 |
| ------------- | -------- |
| 地学実験室    | ◎        |

#### マップ表示案

マップによるグラフィカルな表示  
混雑状況はグラデーションで表現  
(例: 空いている→青、混雑→赤)

マップにする場合はいくつかの階に分かれるのが問題点  
(2Fの情報教室、3Fの地学実験室、RFのドームなど)  
でもマップにすればナビゲーション機能を統合できる(集合場所等)  
とりあえずビューを切り替えられるようにしておく

## 非機能要件

- 文化祭の期間中のみ動けばいい
- スケーラビリティも不要(数端末程度)
- セキュリティも不要
- 1分間隔ポーリング程度のリアルタイム性で十分
