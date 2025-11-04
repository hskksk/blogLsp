# システムプロンプトに入れるもの

## カスタマイズ不可

### 4. Constraints & Formatting (The "How")

This sets the rules, boundaries, and stylistic requirements for the output.

* `What to Avoid:`
    * Specify any topics, jargon, common misconceptions, or opinions to exclude. (e.g., "Do not mention competing products," "Avoid overly technical jargon," "Do not make financial promises.")

  * 表現・トーンの禁止:

      * 断定・誇張: 「『絶対に』『間違いなく』『〜すべき』といった強すぎる断定や、『世界最高』『唯一の』といった誇張表現は使用しないこと。」
      * 否定・批判: 「既存の技術や他のアプローチを『古い』『ダメだ』などと強く批判・否定する論調は避けること。」
      * 専門用語の乱用: 「（ターゲット層に合わせて）特定の専門用語（例：『イディオマティック』『トランザクション』）は避け、平易な言葉で説明するか、やむを得ず使う場合は必ず注釈を入れること。」

  * AI・LLM特有の「癖」の排除:

      * 常套句の禁止: 「『〜の重要性は言うまでもありません』『いかがでしたでしょうか？』『本記事では〜について解説します』といった、ありきたりな導入や結論のフレーズは使わないこと。」
      * 自己言及の禁止: 「『私はAIなので〜』『私の知識では〜』といった、AI自身の人格や能力に関する記述は一切行わないこと。」
      * 過度な要約: 「結論部分で、本文で述べたことをそのまま要約して繰り返すだけの内容は避けること。代わりに、読者の次の行動を促す内容にする。」

* `Formatting Requirements:`
  * 出力形式:
      * マークダウン指定: 「出力は必ず Markdown 形式 とすること。」

  * 全体構造:
      * 必須セクション: 「記事は必ず『導入（Hook）』『本文（複数のH2で構成）』『結論（Call to Action）』の3部構成を厳守すること。」
      * 導入部の指定: 「導入部は、読者が直面している『問題』を提示し、この記事がその『解決策』を提供することを示す内容にすること。文字数は150文字程度とする。」
      * 結論部の指定: 「結論部（`## おわりに`）では、記事の要約ではなく、読者に次に取ってほしい行動（例：関連記事への誘導、資料請求、コメントの促進）を明確に示すこと。」

  * 見出し (Headings):

      * 階層ルール: 「記事タイトルを H1 (`#`) とし、本文中の大見出しは H2 (`##`)、中見出しは H3 (`###`) のみを使用すること。H4 (`####`) 以上は使用しないこと。」

  * テキスト・段落:
      * 段落の長さ: 「1つの段落は3〜4文程度（約200文字）で簡潔にまとめ、読者が読み疲れないように適度に改行を挟むこと。」
      * 強調: 「最も重要なキーワードや文は、太字（`強調`）で装飾すること。ただし、多用はしないこと（1つのH2セクションで1〜2箇所程度）。」
      * 会話体: 「（必要に応じて）読者の理解を助けるために、`筆者:「〜」` `読者:「〜」` のようなQ\&A形式の会話体を適宜挿入すること。」

  * リスト (箇条書き):
      * 使い分け: 「順序が重要な場合は番号付きリスト（` 1.</code>,  `2.\</code\>）を、並列な関係の場合は順序なしリスト（`*` または `-`）を使用すること。」
      * 文末: 「リストの各項目の文末は『〜です。』『〜ます。』で統一するか、体言止めで統一すること。（例：『ですます調で統一』）」

  * 特殊要素 (コード・引用・注釈):
      * コードブロック: 「コードスニペットは、必ず ` 言語名 ...  ` の形式で、言語（例：`python`, `bash`, `json`）を明記すること。」
      * 引用: 「他の記事や書籍からの引用は、`>` を使ったブロッククオートとして明確に区別すること。」
      * 注釈・補足: 「本文の補足情報や、読者への注意喚起（Warning）は、`> 注記: ...` や `> 注意: ...` のようにブロッククオートと太字で見やすく記載すること。」

  * 文体・記法 (スタイルガイド):
      * 文末: 「文末は『です・ます』調で統一すること。」
      * 記号: 「括弧は全角（）、句読点は全角（、。）、英数字と記号（`:` `/`）は半角を使用すること。」
      * 表記ゆれ: 「『Webサイト』『ウェブサイト』などの表記ゆれを統一すること。（例：『Webサイト』で統一）」

* `Approximate Length:`
    * Provide a target, such as "a 5-minute read," "around 800-1000 words," or "a short, concise post."

## カスタマイズ可

### 1. Identity & Voice (The "Who")

* `Persona:`
    * Who is the "author"? (e.g., "A 10-year industry veteran," "A curious hobbyist," "A skeptical journalist," "An empathetic teacher.")
* `Tone & Style:`
    * How should the author sound? (e.g., "Formal and academic," "Casual and humorous," "Technical and precise," "Encouraging and friendly," "Passionate and persuasive.")
* `Point of View (POV):`
    * Should it be written in the first person ("I think..."), second person ("You will learn..."), or third person ("Researchers found...")?


# コンテキストとしていれるもの

### 2. Audience & Purpose (The "Why")

* `Target Audience:`
    * Who is the ideal reader? (e.g., "Absolute beginners with no experience," "Expert data scientists," "Busy executives," "Students preparing for an exam.")
* `Audience's Goal:`
    * Why is the audience reading this? (e.g., "To solve an immediate problem," "To learn a new skill," "To make a purchase decision," "To be entertained.")
* `Blog Post Objective:`
    * What is the primary goal of the post? (e.g., "To inform," "To persuade," "To teach a step-by-step process," "To share a personal experience," "To generate leads.")
* `Core Thesis:`
    * What is the single, most important message or argument the reader must take away? (e.g., "Python's new library is a game-changer for X," "This common productivity 'hack' is actually counterproductive.")

### 4. Constraints & Formatting (The "How")

* `Keywords (for SEO):`
    * List the primary and secondary keywords that must be included naturally.

# AI generated

## Overall

### 1. Identity & Voice (The "Who")

* `Persona:`
    * Who is the "author"? (e.g., "A 10-year industry veteran," "A curious hobbyist," "A skeptical journalist," "An empathetic teacher.")
* `Tone & Style:`
    * How should the author sound? (e.g., "Formal and academic," "Casual and humorous," "Technical and precise," "Encouraging and friendly," "Passionate and persuasive.")
* `Point of View (POV):`
    * Should it be written in the first person ("I think..."), second person ("You will learn..."), or third person ("Researchers found...")?

### 2. Audience & Purpose (The "Why")

* `Target Audience:`
    * Who is the ideal reader? (e.g., "Absolute beginners with no experience," "Expert data scientists," "Busy executives," "Students preparing for an exam.")
* `Audience's Goal:`
    * Why is the audience reading this? (e.g., "To solve an immediate problem," "To learn a new skill," "To make a purchase decision," "To be entertained.")
* `Blog Post Objective:`
    * What is the primary goal of the post? (e.g., "To inform," "To persuade," "To teach a step-by-step process," "To share a personal experience," "To generate leads.")
* `Core Thesis:`
    * What is the single, most important message or argument the reader must take away? (e.g., "Python's new library is a game-changer for X," "This common productivity 'hack' is actually counterproductive.")

### 3. Content & Structure (The "What")

* `Working Title / Topic:`
    * A clear, descriptive title or topic (e.g., "A Beginner's Guide to Asynchronous APIs in Python").
* `Source Material / Raw Input:`
    * (This is crucial for personalizing) Provide the core content to be expanded upon, such as: "Base this post on the following raw notes: [...]", "Use this personal anecdote: [...]", or "Expand on this transcript: [...]".
* `Key Talking Points:`
    * A bulleted list of "must-include" facts, arguments, examples, or data points.
* `Desired Outline:`
    * Provide the specific sections and headings (H2s, H3s) you want.
    > Example:
    > * Introduction (Hook the reader)
    > * What is Problem X?
    > * Why Common Solution Y Fails
    > * A Better Approach: Solution Z
    > * Conclusion & Key Takeaways
* `Call to Action (CTA):`
    * What should the reader do after finishing the post? (e.g., "Leave a comment with your experience," "Subscribe to the newsletter," "Read the next post in this series," "Try this code yourself.")

### 4. Constraints & Formatting (The "How")

This sets the rules, boundaries, and stylistic requirements for the output.

* `Keywords (for SEO):`
    * List the primary and secondary keywords that must be included naturally.
* `What to Avoid:`
    * Specify any topics, jargon, common misconceptions, or opinions to exclude. (e.g., "Do not mention competing products," "Avoid overly technical jargon," "Do not make financial promises.")
* `Formatting Requirements:`
    * Specify any structural elements. (e.g., "Use bullet points for lists," "Include at least one code block," "Keep paragraphs short (2-3 sentences)," "Use blockquotes for examples.")
* `Approximate Length:`
    * Provide a target, such as "a 5-minute read," "around 800-1000 words," or "a short, concise post."
    
## deep dive -1

承知いたしました。「Constraints & Formatting (制約とフォーマット)」について、特に `What to Avoid` と `Formatting Requirements` の2点を深掘りし、プロンプトに含めるべき具体的なカテゴリと指示の例をリストアップします。

これらの詳細な制約を設ける目的は、AIの「暴走」や「癖」を防ぎ、生成物とあなたの期待とのギャップを最小限にすることです。これにより、記事の品質が安定し、後工程での編集・修正コストを大幅に削減できます。

-----

### 1\. `What to Avoid` (避けるべきこと) の詳細カテゴリ

AIが「書いてはいけない」こと、「使ってはいけない」表現を明示的に定義します。

  * トピック・内容の除外:

      * 競合: 「競合製品A、B、Cについては一切言及しないこと。」
      * 範囲外のテーマ: 「今回は『導入方法』に絞るため、『運用後の高度なカスタマイズ』については触れないこと。」
      * 価格・時期: 「具体的な金額や、『今年中』『近日中』などの未確定な時期に関する記述は避けること。」
      * 未確認情報: 「公式発表されていない情報や、憶測、噂レベルの話は一切含めないこと。」

  * 表現・トーンの禁止:

      * 断定・誇張: 「『絶対に』『間違いなく』『〜すべき』といった強すぎる断定や、『世界最高』『唯一の』といった誇張表現は使用しないこと。」
      * 否定・批判: 「既存の技術や他のアプローチを『古い』『ダメだ』などと強く批判・否定する論調は避けること。」
      * 専門用語の乱用: 「（ターゲット層に合わせて）特定の専門用語（例：『イディオマティック』『トランザクション』）は避け、平易な言葉で説明するか、やむを得ず使う場合は必ず注釈を入れること。」
      * 内輪ネタ: 「社内用語や、一部のコミュニティでしか通じないミームやジョークは使用しないこと。」

  * AI・LLM特有の「癖」の排除:

      * 常套句の禁止: 「『〜の重要性は言うまでもありません』『いかがでしたでしょうか？』『本記事では〜について解説します』といった、ありきたりな導入や結論のフレーズは使わないこと。」
      * 自己言及の禁止: 「『私はAIなので〜』『私の知識では〜』といった、AI自身の人格や能力に関する記述は一切行わないこと。」
      * 過度な要約: 「結論部分で、本文で述べたことをそのまま要約して繰り返すだけの内容は避けること。代わりに、読者の次の行動を促す内容にする。」
      * 道徳的な説教: 「（技術記事などの場合）テーマと無関係な倫理観や道徳的な意見（例：『技術は正しく使うべきです』）を述べないこと。」

  * 主張・立場の制限:

      * 政治・宗教: 「政治的、宗教的、社会的に議論の分かれるトピックに関する見解は一切含めないこと。」
      * 投資助言など: 「（金融系の記事の場合）『この銘柄は買いだ』などの具体的な投資助言と受け取れる表現は厳禁とする。必ず『本記事は情報提供を目的としており、投資を推奨するものではありません』という免責事項を入れること。」

-----

### 2\. `Formatting Requirements` (フォーマット要件) の詳細カテゴリ

記事の「見た目」と「構造」を定義し、読みやすさと再利用性を高めます。

  * 出力形式:

      * マークダウン指定: 「出力は必ず Markdown 形式 とすること。」
      * ファイル構造: 「ファイル名（`title.md`）、見出し（H1）、本文、という形式で出力すること。」

  * 全体構造:

      * 必須セクション: 「記事は必ず『導入（Hook）』『本文（複数のH2で構成）』『結論（Call to Action）』の3部構成を厳守すること。」
      * 導入部の指定: 「導入部は、読者が直面している『問題』を提示し、この記事がその『解決策』を提供することを示す内容にすること。文字数は150文字程度とする。」
      * 結論部の指定: 「結論部（`## おわりに`）では、記事の要約ではなく、読者に次に取ってほしい行動（例：関連記事への誘導、資料請求、コメントの促進）を明確に示すこと。」

  * 見出し (Headings):

      * 階層ルール: 「記事タイトルを H1 (`#`) とし、本文中の大見出しは H2 (`##`)、中見出しは H3 (`###`) のみを使用すること。H4 (`####`) 以上は使用しないこと。」
      * スタイル: 「H2の見出しは、読者の疑問に答える形（例：『〇〇とは？』『〇〇のメリット』）にすること。」

  * テキスト・段落:

      * 段落の長さ: 「1つの段落は3〜4文程度（約200文字）で簡潔にまとめ、読者が読み疲れないように適度に改行を挟むこと。」
      * 強調: 「最も重要なキーワードや文は、太字（`強調`）で装飾すること。ただし、多用はしないこと（1つのH2セクションで1〜2箇所程度）。」
      * 会話体: 「（必要に応じて）読者の理解を助けるために、`筆者:「〜」` `読者:「〜」` のようなQ\&A形式の会話体を適宜挿入すること。」

  * リスト (箇条書き):

      * 使い分け: 「順序が重要な場合は番号付きリスト（` 1.</code>,  `2.\</code\>）を、並列な関係の場合は順序なしリスト（`*` または `-`）を使用すること。」
      * 文末: 「リストの各項目の文末は『〜です。』『〜ます。』で統一するか、体言止めで統一すること。（例：『ですます調で統一』）」

  * 特殊要素 (コード・引用・注釈):

      * コードブロック: 「コードスニペットは、必ず ` 言語名 ...  ` の形式で、言語（例：`python`, `bash`, `json`）を明記すること。」
      * 引用: 「他の記事や書籍からの引用は、`>` を使ったブロッククオートとして明確に区別すること。」
      * 注釈・補足: 「本文の補足情報や、読者への注意喚起（Warning）は、`> 注記: ...` や `> 注意: ...` のようにブロッククオートと太字で見やすく記載すること。」

  * 文体・記法 (スタイルガイド):

      * 文末: 「文末は『です・ます』調で統一すること。」
      * 記号: 「括弧は全角（）、句読点は全角（、。）、英数字と記号（`:` `/`）は半角を使用すること。」
      * 表記ゆれ: 「『Webサイト』『ウェブサイト』などの表記ゆれを統一すること。（例：『Webサイト』で統一）」

これらの詳細な制約をプロンプトに組み込むことで、AIはより「優秀なアシスタント」として機能し、あなたの意図を正確に反映した記事を生成できるようになります。

これらのカテゴリを踏まえて、実際にあなたのブログ記事作成用の「完璧なプロンプトテンプレート」を一緒に作成してみますか？