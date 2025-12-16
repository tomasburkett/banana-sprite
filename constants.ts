export const DEFAULT_CHARACTER_BASE64 = null;

export interface Preset {
  id: string;
  label: { ja: string; en: string };
  prompt: string;
}

export const PRESETS: Preset[] = [
  {
    id: "walk",
    label: { ja: "歩く (Walking)", en: "Walking" },
    prompt: `🟦 Walking (Right) / 歩く
キャラクターが右向きで自然に歩くモーションを作成してください。

【動きの要件】
- 右足→左足→右足の順に歩行サイクルを行う
- 腕は足と逆方向にスイングする
- 頭と体が歩行リズムに合わせてわずかに上下する
- 全体的にゆっくりした歩行動作にする`
  },
  {
    id: "run",
    label: { ja: "走る (Running)", en: "Running" },
    prompt: `🟦 Running (Right) / 走る
キャラクターが右向きで走るモーションを作成してください。

【動きの要件】
- 歩行よりも大きなストライドで素早く足を入れ替える
- 体は前傾し、全体にスピード感がある
- 腕の振りを強調し、勢いのある走りにする
- 地面を蹴る→浮く→接地 のリズムを繰り返す`
  },
  {
    id: "idle",
    label: { ja: "待機 (Idle)", en: "Idle" },
    prompt: `🟦 Idle / 待機
キャラクターが右向きで立ち、自然に待機するモーションを作成してください。

【動きの要件】
- 呼吸に合わせて胸と肩がわずかに上下する
- 髪や体が微小に揺れる程度の軽い動き
- 全体の姿勢は変えず、柔らかい生命感だけを表現する`
  },
  {
    id: "attack",
    label: { ja: "攻撃 (Attack)", en: "Attack" },
    prompt: `🟦 Attack / 攻撃
キャラクターが右向きで攻撃するモーションを作成してください。

【動きの要件】
- 準備動作（溜め）→攻撃の瞬間→戻り の流れを含める
- 腰をひねり、腕や武器を前方に突き出す
- 不必要なエフェクトは描かず、体の動きのみで攻撃を表現`
  },
  {
    id: "jump",
    label: { ja: "ジャンプ (Jump)", en: "Jump" },
    prompt: `🟦 Jump / ジャンプ
キャラクターが右向きでジャンプするモーションを作成してください。

【動きの要件】
- 踏み切り → 上昇 → 頂点 → 下降 → 着地 の順で動作を構成する
- 重力を感じる自然なジャンプ軌道にする
- 最後は元の立ち姿勢に戻る`
  },
  {
    id: "damage",
    label: { ja: "ダメージ (Damage)", en: "Damage" },
    prompt: `🟦 Damaged / ダメージ
キャラクターが右向きでダメージを受けるモーションを作成してください。

【動きの要件】
- ダメージを受けた瞬間、体が後ろにわずかに反る
- 衝撃波や斬撃などのヒットエフェクトを描画し、痛みを強調する
- 反動で揺れるような動きを入れる
- 最後は構えに戻る`
  },
  {
    id: "magic",
    label: { ja: "魔法詠唱 (Magic)", en: "Magic Cast" },
    prompt: `🟦 Magic Cast / 魔法詠唱
キャラクターが右向きで魔法を詠唱するモーションを作成してください。

【動きの要件】
- 祈るように両手を前に構える、または胸元に寄せる
- 詠唱中は小さな揺れや手の動きを入れる
- 光や炎などの魔法エフェクト（パーティクルやオーラ）を加えて表現する`
  },
  {
    id: "victory",
    label: { ja: "勝利 (Victory)", en: "Victory" },
    prompt: `🟦 Victory / 勝利
キャラクターが右向きで勝利ポーズを取るモーションを作成してください。

【動きの要件】
- 胸を張る、片腕を掲げる、軽く跳ねるなどの勝利アクションを入れる
- 最後は決めポーズで静止させる`
  }
];

export interface ExpressionPreset {
  id: string;
  label: { ja: string; en: string };
  prompt: string;
}

export const EXPRESSION_PRESETS: ExpressionPreset[] = [
  {
    id: "happy",
    label: { ja: "喜び (Happy)", en: "Happy" },
    prompt: `表情付きスプライトシートを作成してください。キャラクターは喜びの表情をしています。

【表情の要件】
- 目は大きく開き、笑顔で口が開いている
- 眉毛は上がり、明るい印象
- 16フレームで表情の変化を表現（笑顔の強弱、瞬きなど）
- 各フレームで顔パーツ（目・口）の位置が統一されている`
  },
  {
    id: "angry",
    label: { ja: "怒り (Angry)", en: "Angry" },
    prompt: `表情付きスプライトシートを作成してください。キャラクターは怒りの表情をしています。

【表情の要件】
- 目は細く、眉は下がり、口は閉じているか叫んでいる
- 眉毛は中央に寄り、険しい印象
- 16フレームで表情の変化を表現（怒りの強弱、瞬きなど）
- 各フレームで顔パーツ（目・口）の位置が統一されている`
  },
  {
    id: "sad",
    label: { ja: "悲しみ (Sad)", en: "Sad" },
    prompt: `表情付きスプライトシートを作成してください。キャラクターは悲しみの表情をしています。

【表情の要件】
- 目は下がり、口は下向きに曲がっている
- 眉毛は下がり、憂いのある印象
- 16フレームで表情の変化を表現（悲しみの強弱、涙、瞬きなど）
- 各フレームで顔パーツ（目・口）の位置が統一されている`
  },
  {
    id: "surprised",
    label: { ja: "驚き (Surprised)", en: "Surprised" },
    prompt: `表情付きスプライトシートを作成してください。キャラクターは驚きの表情をしています。

【表情の要件】
- 目は大きく見開き、口は開いている
- 眉毛は上がり、驚いた印象
- 16フレームで表情の変化を表現（驚きの強弱、瞬きなど）
- 各フレームで顔パーツ（目・口）の位置が統一されている`
  },
  {
    id: "neutral",
    label: { ja: "無表情 (Neutral)", en: "Neutral" },
    prompt: `表情付きスプライトシートを作成してください。キャラクターは無表情です。

【表情の要件】
- 目は普通の大きさ、口は閉じている
- 眉毛は自然な位置、感情のない印象
- 16フレームで瞬きなどの自然な動きを表現
- 各フレームで顔パーツ（目・口）の位置が統一されている`
  },
  {
    id: "custom",
    label: { ja: "カスタム (Custom)", en: "Custom" },
    prompt: ``
  }
];

export const TRANSLATIONS = {
  ja: {
    subtitle: "Nano Banana Pro搭載 ドット絵ジェネレーター",
    introTitle: "AIで高品質なドット絵素材を作成",
    introText: "手持ちのキャラ画像をアップロードして、動きを選ぶだけ。ゲームや動画で使える「4x4 スプライトシート」をAIが一瞬で生成します。",
    step1: "1. 元画像を選択（必須）",
    step2: "2. 動きの種類を選ぶ",
    placeholder: "作りたい動きの詳細をここに入力...（例: 剣を振る、魔法を唱えるなど）",
    uploadText: "画像をアップロード",
    uploadSubtext: "PNG / JPG / WEBP (自動で正方形に調整されます)",
    refLoaded: "画像をセットしました",
    refProcessed: "AIが認識しやすいよう、自動で白背景・正方形に整形しました。",
    remove: "画像を削除",
    generateBtn: "スプライトを生成する",
    generating: "AIが描画中...",
    timeEst: "処理には10〜20秒ほどかかります",
    results: "完成したスプライト",
    downloadPng: "PNG画像を保存",
    downloadGif: "GIFアニメを保存",
    spriteSheet: "スプライトシート (4x4)",
    preview: "アニメーション確認",
    apiKeyRequired: "Gemini 3 Pro のAPIキーが必要です（有料プラン）",
    selectKey: "APIキーを設定",
    billingDocs: "料金設定について確認する",
    apiKeyDialogTitle: "APIキーを入力",
    apiKeyDialogDescription: "Gemini APIキーを入力してください。APIキーがない場合は、下のリンクから取得方法を確認してください。",
    apiKeyLabel: "APIキー",
    apiKeyPlaceholder: "AIza...",
    apiKeyHelpText: "APIキーの取得方法が分からない場合は、以下のリンクを参照してください：",
    apiKeyHelpLink: "APIキーの取得方法（Google AI Studio）",
    cancel: "キャンセル",
    save: "保存",
    apiKeySetSuccess: "APIキーが新しく設定されました。",
    greenBackgroundLabel: "グリーンバック背景を使用",
    greenBackgroundInfo: "クロマキー用",
    noteGacha: "※ AI生成のため、仕上がりにはばらつき（ガチャ要素）があります。何度か試してみてください。",
    noteOverwrite: "※ 再生成すると現在の結果は上書きされます。必要な画像は先にダウンロードしてください。",
    faceAnimation: "表情付きアニメーション",
    recordingStart: "録画開始",
    recordingStop: "録画停止",
    recordingCancel: "キャンセル",
    recordingStatus: "録画ステータス",
    microphonePermission: "マイク許可",
    microphoneNotAllowed: "マイクが許可されていません",
    audioInputMode: "音声入力モード",
    audioFile: "ファイル",
    audioMicrophone: "マイク",
    uploadAudioFile: "音声ファイルをアップロード",
    volumeThreshold: "音量しきい値",
    blinkInterval: "瞬き間隔",
    debugGuides: "デバッグガイド",
    downloadWebm: "WebM動画を保存",
    recordingIdle: "待機中",
    recordingRecording: "録画中...",
    recordingSaving: "保存中...",
    webmNotSupported: "WebM録画はこのブラウザではサポートされていません",
    expressionEditor: "表情エディター",
    expressionEditorDescription: "スプライトシートをアップロードして、音声に同期した表情付きアニメーションを作成できます",
    selectExpression: "表情の種類を選ぶ",
    expressionPrompt: "表情のプロンプト",
    expressionPromptPlaceholder: "表情の詳細をここに入力...（例: 笑顔、怒り、悲しみなど）",
    generateExpressionSprite: "表情付きスプライトを生成",
    expressionGenerating: "AIが描画中...",
    uploadSpriteSheet: "スプライトシートをアップロード",
    selectSpriteSheet: "スプライトシートを選択",
    selectDifferentSpriteSheet: "別のスプライトシートを選択"
  },
  en: {
    subtitle: "Powered by Gemini Nano Banana Pro",
    introTitle: "Create Professional Sprite Sheets",
    introText: "Upload a character, pick a move, and get a perfectly aligned 4x4 sprite sheet instantly. Optimized for game dev and animation.",
    step1: "1. Character Reference (Required)",
    step2: "2. Select Movement",
    placeholder: "Describe the movement details here...",
    uploadText: "Click to upload or drag & drop",
    uploadSubtext: "PNG, JPG, WEBP (Auto-formatted to 1:1)",
    refLoaded: "Reference Loaded",
    refProcessed: "Image has been automatically processed to a 1:1 square ratio with a white background for optimal generation.",
    remove: "Remove",
    generateBtn: "Generate Sprite Sheet",
    generating: "Generating...",
    timeEst: "Takes about 10-20 seconds",
    results: "Generated Results",
    downloadPng: "Download PNG",
    downloadGif: "Download GIF",
    spriteSheet: "Sprite Sheet (4x4)",
    preview: "Preview",
    apiKeyRequired: "A valid API Key (Gemini 3 Pro) is required.",
    selectKey: "Select API Key",
    billingDocs: "Billing Documentation",
    apiKeyDialogTitle: "Enter API Key",
    apiKeyDialogDescription: "Please enter your Gemini API key. If you don't have one, check the link below for instructions.",
    apiKeyLabel: "API Key",
    apiKeyPlaceholder: "AIza...",
    apiKeyHelpText: "If you don't know how to get an API key, please refer to the following link:",
    apiKeyHelpLink: "How to get an API key (Google AI Studio)",
    cancel: "Cancel",
    save: "Save",
    apiKeySetSuccess: "API key has been set successfully.",
    greenBackgroundLabel: "Use green background",
    greenBackgroundInfo: "For chroma key",
    noteGacha: "* Results may vary due to AI randomness. Try multiple times for best results.",
    noteOverwrite: "* Generating again will overwrite the current result. Please download first if needed.",
    faceAnimation: "Face Animation",
    recordingStart: "Start Recording",
    recordingStop: "Stop Recording",
    recordingCancel: "Cancel",
    recordingStatus: "Recording Status",
    microphonePermission: "Microphone Permission",
    microphoneNotAllowed: "Microphone not allowed",
    audioInputMode: "Audio Input Mode",
    audioFile: "File",
    audioMicrophone: "Microphone",
    uploadAudioFile: "Upload Audio File",
    volumeThreshold: "Volume Threshold",
    blinkInterval: "Blink Interval",
    debugGuides: "Debug Guides",
    downloadWebm: "Download WebM Video",
    recordingIdle: "Idle",
    recordingRecording: "Recording...",
    recordingSaving: "Saving...",
    webmNotSupported: "WebM recording is not supported in this browser",
    expressionEditor: "Expression Editor",
    expressionEditorDescription: "Upload a sprite sheet and create animated expressions synchronized with audio",
    selectExpression: "Select Expression Type",
    expressionPrompt: "Expression Prompt",
    expressionPromptPlaceholder: "Describe the expression details here...",
    generateExpressionSprite: "Generate Expression Sprite",
    expressionGenerating: "Generating...",
    uploadSpriteSheet: "Upload Sprite Sheet",
    selectSpriteSheet: "Select Sprite Sheet",
    selectDifferentSpriteSheet: "Select Different Sprite Sheet"
  }
};