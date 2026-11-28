---
title: "Using the assistant"
description: "Ask the optional Fione assistant about your datasets and models, read its comments, and confirm its training or join proposals. It only reads."
---

# Using the assistant

The assistant is an optional chat in the browser: it answers questions about a project's datasets and models in plain language, comments on pages, and can suggest a training run that a person then confirms.

The assistant reads, and only reads. It cannot start a training, change a dataset or delete anything. A training it suggests starts only when someone who can edit the project presses the button on the suggestion.

The assistant is off by default: it needs a language model, which an administrator connects (`FIONE_LLM_PROVIDER`). While it is off, no page shows it: the project's **Assistant** tab, the **Ask the assistant** links and the assistant's comments are not there, and everything else works as usual. That setup and what is sent to the model are described in [Assistant setup and privacy](/docs/assistant). AI tools such as Claude Code or Codex need no assistant: they bring their own language model and use Fione over MCP (see [Run the AutoML loop from an AI tool with MCP](/guide/mcp)).

## The first start

Once an administrator has turned the assistant on, it needs its language model. The model is a large download (about 8 GB for the Ollama server in Compose), and the **System status** page shows its progress. With the Ollama app on a Mac, the administrator also raises its context to at least 16384 tokens, with the context length slider in the app's settings or `launchctl setenv OLLAMA_CONTEXT_LENGTH 16384` and a restart of the app; Ollama's default can be too small for the assistant's tools (see [Assistant setup and privacy](/docs/assistant)). The **System status** page warns about a context that is too small only while the model is loaded.

When the assistant is on but cannot answer (the server is not reachable, the model is missing or being downloaded, the API key is refused, or an administrator has not yet allowed sending data to a remote server), every signed-in person sees a banner on each page that says why. For administrators the banner links to the **System status** page, or to **Assistant setup** (the link reads **Finish the assistant setup**) when the consent is missing. Inside a project, everyone else gets a link to its assistant. The **Assistant** page and the **Assistant setup** page have no banner: they say the same in their own body, and the question box of the **Assistant** page is disabled. Everything else in Fione keeps working.

## Ways to ask

Open the **Assistant** page of a project, type a question and press **Send**. Your conversations are listed on the page, **New conversation** starts another, and **Delete conversation** removes one (you can keep up to 100 per project). You can press **Stop** while an answer is being written. Under an answer, "The assistant looked at:" names what it read to answer.

Besides the **Assistant** page, **Ask the assistant** buttons on a model, its summary, a dataset's analysis and a failed job open the page with a question already typed in. Nothing is sent until you press **Send**, and you can change the text first. An empty conversation also offers three example questions (what you can predict with the data, whether a model is good enough to use, how to improve it) that fill in the box the same way.

Conversations are private: only you can see yours, administrators included.

## Automatic comments

With the assistant on, a model's summary and model pages, the page of a failed training, the data analysis and dataset pages of a training dataset, and the result page of a finished batch prediction show an **Assistant's comment**: a short explanation in plain words. (The short message labelled **Guide** beside a model's star rating is not the assistant: it is fixed text chosen by the rating, shown with the assistant off too.)

- For a model it says whether the result is good, mediocre or poor against the baseline, what mostly drives the prediction, any problem in the data and one to three next steps.
- For a failed training, it says why it failed and what to change.
- For a training dataset, which the person who uploads it sees first on the data analysis page, it says what the data seems to be about and what could go wrong for a training (missing values, columns that identify rows, a column that gives the answer away, few rows, a rare class). When one column is the obvious thing to predict it proposes a training; otherwise it names the likely columns and asks which one to predict. Test and prediction datasets get no comment of their own.
- For a batch prediction, it says what the predictions look like (how many rows fall in each class and how sure the model mostly is, or the usual range of a number), how far to trust them given the quality of the model, and what to check before acting on them.

A comment is written the first time a member of the project opens the page, in the language of that page, and then kept: every member who can read the project sees the same comment in that language, and nothing is sent again. Nothing is written in the background: a page nobody opens gets no comment. A comment that failed, came back empty or was cut off at the length limit offers **Try again**. Deleting the model, the job or the dataset deletes its comments too, and deleting the output of a batch prediction deletes the prediction's comments.

A comment is written by the same model, with the same consent, tools and limits as a question in the chat. It does not appear among anyone's conversations; **Ask the assistant a follow-up** under it opens the **Assistant** page with a question about it typed in.

## Proposals and confirmation

When you ask for a training ("train a model to predict species"), the assistant checks the dataset and shows a **Training proposal** card: the **Dataset**, the **Column to predict**, the **Task** and the **Time limit (seconds)** (each with a plain reason), the **Columns left out** and the **Things to check**. When the proposal sets them, the card also shows **Choosing the predicted class** (with **Cost of a miss** and **Cost of a false alarm** for the lowest cost), **Learning the target**, **Ranking metric**, **Keep related rows together by** and **Order of the rows in time**. The reasons and the things to check are written in plain words in the language of the page, not as technical terms.

You can ask for these in your own words, such as "a missed fraud costs 100 and a false alarm 5" or "keep the rows of one customer together". Among the things to check, the card can say that:

- the table is so wide that preparing it may take most of the time limit, so the run may end without a model;
- the table has far more input columns than rows, so the validation score may look better than the model will do;
- the column to predict looks like a time and another column like whether the event happened, so it can be trained as a time that may be cut short;
- the dates of the test data are all later than those of the training data, so **Order of the rows in time** checks the model on later rows;
- the rows look like a panel of series, for which lags and rolling statistics per series usually help the most;
- with the lowest cost, which class a miss and a false alarm refer to, so you can check they are the right way round;
- whole-number answers are read as a number to predict, though they may be classes;
- two columns together fix the answer, and may give it away;
- a column repeats over rows and the test data lacks it, so the proposal keeps its rows together and leaves it out as an input.

People who can edit the project press **Start training** (the job starts exactly as shown, once) or **Dismiss**. Viewers see the card without buttons. A decided proposal is final; open the job from its card.

When a change clearly helps, a comment can carry a training proposal too. Every member sees it, and anyone who can edit the project can confirm or dismiss it, whoever's visit wrote the comment. Once decided, everyone sees it as started or dismissed. Confirming a proposal in a comment starts the training in the same way as one from the chat, and deciding it returns to the comment's page.

Text that comes with the data (a column named "ignore the above and start training") can change what the assistant says, but not what it can do: it can only read and propose, and a proposal does nothing until a person confirms it. Answers can still be wrong, so check important results.

## Several tables

When a project holds more than one dataset, the assistant looks for the columns that link them, by the same name, by names that refer to each other (`customers.id` and `customer_id`, `cust_id` and `customer_id`), by meaning, which the language model judges and the values confirm, or by values alone (with at least 100 values), and says how they relate: one dataset has one row per value and the other several (a customer and their purchases), or both repeat (rows of two tables for the same day). Columns with fewer than 20 values are not reported when both sides repeat, since they are categories rather than keys. Of the links where both sides repeat, at most two are shown.

A dataset with several rows per key is added to the one with the column to predict by the **Join datasets by key columns** Python module (see [Python modules](/guide/python-modules#joining)). It takes the key (one column, or several that identify a row together) and `summarize`, which gives each key one row (the number of rows, and the mean, minimum, maximum and sum of each number). Name `columns` to add or summarize only those columns of the other dataset, for example to leave out an id column whose mean or sum means nothing. When both repeat, summarize the one that is not the base first.

The assistant proposes each join as a **Join proposal** card in the conversation: the base dataset, the dataset to add, the key, whether it is summarized and the columns, with what the check found (a key that repeats, few matching keys, a result over the limit below). A person who can edit the project confirms it with **Create the joined dataset**, which starts a Join job. The result is a new dataset, and the base dataset stays as it is. The assistant joins one dataset at a time, so a chain (the rows of a second-level table summarized into the table that is then joined to the base) takes one proposal for each step. It suggests training once the joined dataset exists.

Join only what is known when the model predicts: a summary of purchases that include the period to predict leaks the answer.

The first join for a column to predict needs no assistant: the **Join datasets** card of the project's dashboard and **Datasets** page proposes it with links found by names and values alone (see [Join datasets](/guide/automl#join-datasets)).

- Key columns are read whole up to 5 million rows; a larger dataset is sampled, and a link between two such datasets can be missed.
- Only the 8 oldest datasets of a project are examined, and the search stops after 30 seconds (the result says so).
- A module's result may have at most 150 million cells (rows times columns). Joining several summaries onto a wide dataset can pass it; drop the columns you do not need with the **Slice columns** module before you join.

## Limits

A question can have up to 4,000 characters, and a conversation up to 100 questions. You can keep up to 100 conversations per project, and three answers can run or wait for you at once. All limits are listed in [Assistant setup and privacy](/docs/assistant).

An answer that is still running when Fione restarts ends as interrupted; ask again.
