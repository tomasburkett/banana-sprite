Banana Sprite – 顔パーツアニメーション機能 実装プラン（TDD版）

## 1. 目的と前提
- 目的: AI生成の4x4スプライトシートから顔パーツ（目/口）を抽出し、音声（アップロード音声ファイルを基本、マイク入力も選択可）に同期した口パクとランダム瞬きを付与したアニメーションをリアルタイム表示し、WebMとして出力できるようにする（GIFは扱わない）。
- 前提: 既存スタックは React + TypeScript + Vite、クライアントサイド完結（既存のGemini生成API以外は追加サーバーなし）。`components/SpriteDisplay.tsx` が16フレーム表示とGIF生成を担当し、`services/imageUtils.ts` が分割/生成を担う。

## 2. TDD方針・ツール
- テストランナー: Vitest + jsdom（追加依存: `vitest`, `@vitest/ui`, `jsdom`）。Canvas補完が必要なら `happy-dom` も検討。
- Reactテスト: `@testing-library/react`, `@testing-library/user-event`。カスタムフックは `renderHook` を利用。
- モック: `AudioContext` / `MediaRecorder` / `Canvas` / `window.gifshot` をテストごとにフェイク注入。E2Eは不要、結合テストをRTLで代替。
- フィクスチャ: `public/fixtures/images/` に `sprite_valid_4x4.png`（正常4x4）、`sprite_invalid_non_square.png`（異常サイズ）、`sprite_face_mask_colored.png`（パーツ矩形検証用カラー）を配置。音声は `public/fixtures/audio/voice_test_speech.wav` を使用。
- 進め方: 各タスクで「失敗するテストを先に書く → 最小実装 → リファクタ」。UIもRTLで操作テストを先行。
- 音声入力テスト方針: Audioファイル→AudioBuffer→AnalyserNodeへのデコードをユニットテストし、マイクモック（Fake MediaStream）と同じ経路を通す。リアルタイム相当のループはタイマーをフェイクしつつ音量系列を供給する。

## 3. アーキテクチャ概要
- 新規モジュール: 顔パーツ抽出と表情制御をカプセル化する `FaceAnimator`（仮）コンポーネント＋`useAudioMouthSync`フック＋`faceParts.ts`ユーティリティ。
- データフロー:
  1) 生成済みスプライトシート(Base64) → `sliceSpriteSheet` で16フレーム抽出
  2) 各フレームから目/口パーツを `extractFaceParts` で切り出し
  3) 表情ステート（mouth: open/closed, eye: open/closed）を `useAudioMouthSync` と `useBlinkScheduler` で駆動
  4) `renderCompositeFrame` でベースフレーム＋現在の目/口パーツを合成しCanvas描画
  5) Canvas `captureStream()` + MediaRecorder でWebM録画（音声長に応じた録画時間設定、キャンセル可）
- 依存コンポーネント: 既存 `SpriteDisplay` に新しい「表情付きプレビュー/録画」タブを追加するか、別カードとして並置。

## 4. 実装タスク詳細（各ステップをTDDで実施）
### 4.1 スプライト分割と検証
- 先に書くテスト: 正方形かつ4で割り切れる画像のみ通過／異常サイズで例外。
- `services/imageUtils.ts` に `validateSpriteSheetSize(img: HTMLImageElement)` を追加し、NGなら例外＋UI警告。
- `sliceSpriteSheet` を再利用し、分割結果16枚を `Frame[]` として返す型を明確化（幅/高さメタ情報を含める）。

### 4.2 顔パーツ抽出
- 先に書くテスト: 指定矩形を正しく切り出す（フィクスチャPNGで色パターン検証）。未知キーで失敗。
- `src/faceParts.ts`（新規）:
  - `FACE_PARTS` 定数: `{ eyesOpen, eyesClosed, mouthOpen, mouthClosed }` の `x, y, w, h` を一元管理。
  - `extractFaceParts(frame: string, parts: FacePartRectMap): Promise<FacePartImages>` でCanvasトリム。
- デバッグオーバーレイ用 `drawFaceGuides(ctx, parts, scale)` を同ファイルに用意。

### 4.3 表情ステート制御（音声入力: アップロードを基本、マイクも可）
- 先に書くテスト:
  - 音量が閾値を跨いだら mouth が open/closed に遷移（AudioContextモック）。
  - アップロード音声（AudioBuffer）を解析し、マイク入力と同じ処理系で mouthState が変わること。
  - 瞬きがランダム間隔で発火し、`blinkDuration` 後に戻る。
- `useAudioMouthSync`（新規フック）
  - 音声入力ソースを抽象化: `source = uploadedAudio | microphoneStream`。
  - AudioBuffer（ファイルアップロード）または MediaStream（マイク）を AnalyserNode に接続し、RMS/ピークで音量取得。
  - `threshold`/`attack`/`release` パラメータを持ち、`mouthState` を `open/closed` で返す。
  - マイク未許可時はフォールバック「常にclosed」＋UI警告。
- `useBlinkScheduler`（新規フック）
  - `minInterval`/`maxInterval`（例: 2〜6秒）と `blinkDuration`（例: 120ms）をパラメータ化。
  - 状態 `eyeState: open/closed` を返し、合成に利用。

### 4.4 合成描画（リアルタイムプレビュー）
- 先に書くテスト: 表情state変更で合成結果が変わる（ピクセル比較 or スナップショット）。`debugGuides` true でガイド線が描かれる（デバッグ用フラグでのみ有効、一般UIには出さない）。
- `FaceAnimator` コンポーネント（新規）
  - props: `frames: string[]`, `width: number`, `height: number`, `debugGuides?: boolean`.
  - 内部: `useAudioMouthSync` + `useBlinkScheduler` で表情ステート管理。
  - `renderCompositeFrame(frameIndex)`:
    - ベースフレームをCanvasに描画。
    - 現在の `eyeState`/`mouthState` に対応するパーツを重ねる。
    - `debugGuides` true のとき矩形ガイドを描画。
  - 10fpsで描画ループ（既存と同じ周期）。`requestAnimationFrame` か `setTimeout(100ms)` を使用。Canvas解像度は上限固定（例: 512px四方）でユーザー設定不可。

### 4.5 動画出力（WebMのみ）
- 先に書くテスト: MediaRecorder未対応で警告。録画開始→停止で Blob URL を生成（MediaRecorderモック）。音声長に応じて録画秒数が設定されること。キャンセル（停止）ボタンで中断できること。
- WebM:
  - `FaceAnimator` 内Canvasから `captureStream()` → `MediaRecorder`。
  - UIに「録画開始/停止（キャンセル）」ボタンと進行表示、完了後にBlob URLを生成しダウンロードリンクを表示。
  - 録画時間は音声入力長を基準に設定（音声が短い場合は最小値、長い場合は上限を設ける）。長尺はWebMのみで録画。

### 4.6 UI/UX への組み込み
- 先に書くテスト: マイク未許可バッジ表示、閾値スライダーが state を更新、録画ボタンが state に応じて切替。
- `SpriteDisplay` を拡張:
  - タブまたは2カラムで「元スプライトのプレビュー」と「表情付きプレビュー（録画付き）」を並置。
  - マイク許可状態/エラーをバッジ表示。
  - 音声入力モード切替（ファイル/マイク）とアップロードUI、ファイル再生のプレビュー表示。
  - 録画ステータス、ダウンロードボタン、しきい値スライダー（閾値/感度/瞬き間隔）を配置。
  - WebMダウンロードボタンのみ（GIFは非対応）。ビットレート指定や余分なトグルは持たせない。
- 翻訳テキストを `constants.ts` に追加（新しいUI文言: 録画開始/停止、マイク許可、音量しきい値、瞬き設定、デバッグガイドなど）。

### 4.7 デバッグ/品質向上
- 先に書くテスト: 背景占有率が閾値超過で警告。ガイド表示トグルONで矩形が描画される。
- スプライトサイズ検証結果をUIで警告表示。
- 顔パーツガイドのオン/オフスイッチを開発者向けトグルとして提供。
- 背景占有率チェック: 各フレームの透明/単色面積を集計し、異常値なら警告（軽量なピクセルサンプリングで実装）。

### 4.8 型と状態管理
- 先に書くテスト: 型レベルはTSで担保（ビルドが通る）。状態遷移のスナップショットテストを追加。
- `types.ts` に以下を追加:
  - `FacePartKey = 'eyesOpen' | 'eyesClosed' | 'mouthOpen' | 'mouthClosed'`
  - `FacePartRect`, `FacePartImages`, `MouthState`, `EyeState`
  - `RecordingState = 'idle' | 'recording' | 'saving'`
- 状態は `FaceAnimator` 内部で完結させ、親にはシンプルな props/state だけ渡す方針。

## 5. 進行ステップ（Red-Green-Refactorを明示）
1) **テスト基盤導入**: Vitest + RTL + jsdom を追加し、サンプルテストが通ることを確認。
2) **検証・分割**: 失敗テスト（異常サイズ）→実装→リファクタ。
3) **パーツ抽出**: 矩形切り出しテスト→実装→リファクタ。
4) **表情制御フック**: 音量/瞬き状態遷移テスト（アップロード音声・マイク両方の入力経路）→実装→リファクタ。
5) **合成＆プレビュー**: 表情state反映テスト→実装→リファクタ。
6) **出力**: MediaRecorder/GIF呼び出しテスト→実装→リファクタ。
7) **UI統合**: UIインタラクションテスト（バッジ/ボタン/スライダー）→実装→リファクタ。
8) **総合チューニング**: パフォーマンス・フォールバックを手動＋自動テストで確認。

## 6. テスト計画（TDDで先に書く観点）
- ユニット:
  - `validateSpriteSheetSize`（正常/異常）
  - `extractFaceParts`（矩形切り出し、未知キー）
  - `useAudioMouthSync`（閾値越え/戻り、マイク未許可）
  - `useBlinkScheduler`（間隔/継続時間）
- コンポーネント:
  - `FaceAnimator`（表情state変化で描画が変わる、デバッグガイド表示）
  - 拡張後の `SpriteDisplay`（バッジ、録画ボタン、スライダーでstate更新）
- 出力:
  - MediaRecorder未対応時の警告表示、録画開始/停止/キャンセルでBlobが生成されること、音声長に応じた録画時間が設定されること（上限/下限適用）
- 手動確認:
  - 口パク追従・瞬きの自然さ
  - WebMがダウンロード後に再生できること（長尺はWebMのみ）
  - ブラウザ互換（Chrome想定、非対応時のメッセージ）

## 7. 追加メモと不足しているもの
- すべてクライアントサイドで完結。MediaRecorder/AudioContextが非対応のブラウザには対応状況をUIで明示。
- 背景色/透明度の扱い: 合成CanvasはRGBAで保持し、GIF生成時はパレット最適化を検討（必要なら `gifshot` オプションを追加）。
- 定数の座標はあとで実画像を見ながら微調整するため、`FACE_PARTS` を1箇所にまとめて変更容易にする。
- 不足/要検討:
  - テスト依存の追加（Vitest/RTL/jsdom/モック用DOMライブラリ）。
  - フィクスチャ配置済み: `public/fixtures/images/sprite_valid_4x4.png`, `sprite_invalid_non_square.png`, `sprite_face_mask_colored.png`, `public/fixtures/audio/voice_test_speech.wav`。
  - Audio/MediaRecorder/Canvasのモック戦略をコード側にインジェクション可能にするインターフェース。
  - パフォーマンス測定（Canvas合成とMediaRecorder同時実行時のfps低下監視）。

## 8. 前提/設定の固定値（要望反映）
- 対応ブラウザ: Chrome のみで検証。
- 目標フレームレート: 10fps（既存と同じ）。
  - 録画時間: 「音声に合わせる」を基本とし、下限/上限を 5〜60秒で固定。プリセットは必要なら表示（5/10/30/60秒）だが省略可。

## 9. フィクスチャ生成プロンプト例（Gemini Image）
- 正常4x4スプライト用（`public/fixtures/images/sprite_valid_4x4.png`）:
  - 「1024x1024の4x4グリッドに配置されたドット絵スプライトシート。アニメ風の立ち絵キャラクター（右向き、等身は頭身低めのチビキャラ）。16コマで歩行サイクルを表現し、各コマは均等な枠に収まる。背景は完全透明か単色。線はクリーン、色数は少なめ。テキストやロゴなし。」
- 異常サイズテスト用（`public/fixtures/images/sprite_invalid_non_square.png`、あえて崩す）:
  - 「900x1024の非正方形スプライトシート。4x4に見えるが枠がズレている。背景は白。フレームの大きさが不揃いで、上下左右に余白がある。テキストやロゴなし。」
- パーツ検証用カラー配置ミニPNG（`public/fixtures/images/sprite_face_mask_colored.png`、小さめでOK）:
  - 「256x256の4x4ドット絵スプライト。各フレームの顔パーツ位置に識別用の塗り分け色を配置（目=青、口=赤、残り=透明）。他の要素は描かない。」

## 10. テスト用音声プロンプト例（Gemini TTS）
- 目的: 口パク同期検証。10秒前後、強弱とポーズを含む。
- 出力ファイル: `public/fixtures/audio/voice_test_speech.wav`
- 日本語サンプル（文面をTTSへ渡す）:
  - 「こんにちは、バナナのスプライトです。まばたきと口パクのテストをしています。……次はすこし大きな声で話します。はい、これで終わりです。」
- 指示オプション例:
  - 音質: 16kHz/mono 想定（ブラウザ再生を考慮）。
  - 感情・抑揚: 「軽快で明るい声、自然なポーズと間を入れてください。」

