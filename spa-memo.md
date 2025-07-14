# SPAメモ

## 注意点

- DOM全体 と言った場合、DOMのうち div id=app の中身の全部を指す

## ハンドラクラスのメソッド

- prev.cleanupFull()                                       -> void           : 完全cleanup
- next.getTitle()                                          -> $title         : タイトルを取得
- next.getAssetPath()                                      -> $assetPath     : アセットパスを取得
- next.renderingFull()                                     -> void           : DOM全書き換えレンダリング

- prev.canPartialTransferTo($nextPathFixed, $nextParams)   -> bool           : パスへ部分遷移可能か
- next.canPartialReceiveFrom()                             -> bool           : パスから部分遷移可能か
- prev.preparePartialTransfer($nextPathFixed, $nextParams) -> {\$fn \$state} : 部分cleanup/パス非一致関数/状態引き継ぎ
- next.renderingPartial($state)                            -> ()             : DOM維持遷移レンダリング

- prev.canInpageTransferTo($nextPathFixed, $nextParams)    -> bool           : パスへインページ遷移可能か
- prev.renderingInpage($nextPathFixed, $nextParams)        -> ()             : インページ遷移レンダリング

## 遷移フロー

```text
foreach(){$elm.cleanupFn()} <- filter() {nomatch() <- $elm.pattern, $newPath} <- $this.afpathnomatch
$this.afpathnomatch <- filter() {!nomatch() <- $elm.pattern, $newPath} <- $this.afpathnomatch

$prev <- $this.currentHandler
($next_factory, $params) <- router.findHandlerFactory() <- $newPath

# パラメータ変更時の特別処理 //TOD: ここのロジックも問題
if isSameRoute() <- $this.currentPath, $newPath && hasParamChanges() <- $this.currentParams, $newParams ; then
    $prev.onPathParamChange() <- $newParams
else
    $next <- $next_factory.create() <- $newPath, $params, $prevPath
    if $prev.canTransferTo() <- $newPath && $next.canReceiveFrom() ; then
        # 部分遷移
        $state <- $prev.getTransferState() <- $newPath
        $prev.partialCleanup() <- $newPath
        $this.afpathnomatch <- merge() <- $prev.getPathWatchers() <- $newPath
        $this.afdomclear <- push() <- $prev.fullCleanup // 実行しない
        $next.partialRender() <- $this.currentPath, $state
    else
        # 完全遷移
        foreach(){$elm()} <- $this.afdomclear
        $this.afdomclear <- []
        $prev.fullCleanup()
        $assetPath <- $next.getAssetPath()
        if $assetPath ; then
            assetLoader.load() <- $assetPath
        fi
        $next.normalRender()
    fi
    $this.currentHandler <- $next
fi

$this.currentPath <- $newPath
$this.currentParams <- $newParams
```
