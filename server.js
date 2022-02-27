require('dotenv').config();
const fs = require("fs")
const { execSync, exec } = require("child_process")
const discord = require("discord.js");
const { Intents, Client } = require("discord.js");
const { isGeneratorFunction } = require('util/types');
const { decode } = require("iconv-lite")
const options = {
  intents: ["GUILDS", "GUILD_MESSAGES"],
};
const client = new Client(options);
let testData = [];
let data = [];
function brackets(s) {
  let left = s?.indexOf("(");
  let right = s?.indexOf(")");
  return s?.substring(0, left) + s?.substring(right + 1, s.length);
}
const reaction = (num) => (["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"][num])

client.on("messageCreate", async message => {
  if (message.author.bot && message.author.name != "単語帳bot v13")return
  if (message.channel.type !== "GUILD_TEXT") return;
  if (message.guild.channels.cache.get(message.channel.parentId).name !== "単語帳bot") return;
  if (message.channel.name !== "単語帳ターミナル") {
    if (message.content.split("//").length !== 2) {
      message.delete();
    }
    if (message.content === "！ナンバリング" || message.content === "!numbering") {
      message.channel.messages
        .fetch({ limit: 100, after: "0" })
        .then(msg => {
          let msgs = msg
            .filter(message => !message.author.bot)
            .map(message => message);
          for (let a = 0; a < msgs.length; a++) {
            if (msgs[a].reactions.cache.size != 0) {
              msgs[a].reactions.removeAll()
            }
          }
          const length = msgs.length;
          let b = 0;
          for (let a = length - 1; a >= 0; a--) {
            b++;
            let s = String(b);
            let re = [];
            if (b % 5 === 0) {
              if (s.length === 1) {
                re.push(reaction(b));
              } else if (s.length === 2) {
                re.push(reaction(s.charAt(0)));
                re.push(reaction(s.charAt(1)));
              }
            } else if (b === 99) {
              re.push("🇪");
              re.push("🇳");
              re.push("🇩");
            }
            for (let c = 0; c < re.length; c++) {
              if (re.length === 2) {
                if (re[0] === re[1]) {
                  re[1] = "🔁";
                }
              }
              msgs[a].react(re[c]);
            }
          }
        })
        .catch(e => {
          console.log(e);
        });
    }
    return;
  }
  if (message.channel.name === "単語帳ターミナル") {
    var thisGuildTestData = testData.find(
      data => data.guildid === message.guild.id
    );
    if (thisGuildTestData === undefined) {
      testData.push({
        guildid: message.guild.id,
        type: 0,
        testing: false,
        questions: [],
        answers: [],
        trueAns: [],
        tested: [],
        channel: null,
        questionsId: []
      });
      thisGuildTestData = testData.find(data => data.guildid === message.guild.id);
    }
    if (message.content.startsWith("！問題チャンネル作成") || message.content.startsWith("!mkch")) {
      let line = message.content.split(message.content.startsWith("!mkch") ? "," : "、");
      let ch = message.guild.channels.cache.find(channel => channel.name === line[1]);
      if (ch !== undefined) {
        message.channel.send("このチャンネル名は既に存在しています");
        return;
      }
      if (line.length === 2) {
        message.guild.channels.create(line[1], {
          type: "text",
          parent: message.guild.channels.cache.find(g => g.name === "単語帳bot")
        }).then(newChannel => {
          newChannel.send("「問題文//解答」の形式で100題未満で入力してください\n「!numbering」または「！ナンバリング」で題数を数えられます\n()の中の文字及び括弧自体は質問はされますが解答されなくても正解になります");
        }).catch(e => console.log(e))
        message.channel.send("問題チャンネル" + line[1] + "を作成しました");
      } else {
        message.channel.send("「!mkch(！新しい問題チャンネル),チャンネル名」の形式で入力し、チャンネル名に”,”と”、”を含まないようにしてください");
      }
    }
    if ((message.content.startsWith("！テスト開始") || message.content.startsWith("!start")) && !thisGuildTestData.testing) {
      let line = message.content.split(message.content.startsWith("!start") ? "," : "、");
      let questionsChannel = message.guild.channels.cache.find(channel => channel.name === line[1]);
      if (isNaN(line[2] - 0)) {
        let fullWidthNam = ["０", "１", "２"]
        let index = fullWidthNam.indexOf(line[2])
        if (index === -1) {
          message.channel.send("typeは0~2で指定してください")
          return
        } else {
          line[2] = index
        }
      }
      thisGuildTestData.type = line[2];
      if (!(thisGuildTestData.type == "0" || thisGuildTestData.type == "1" || thisGuildTestData.type == "2")) {
        message.channel.send("typeは0~2で指定してください");
        return;
      }
      if (questionsChannel === undefined) {
        message.channel.send("この名前のチャンネルは存在しません");
        return;
      }
      thisGuildTestData.channel = questionsChannel;
      thisGuildTestData.testing = true;
      thisGuildTestData.user = message.author.id;
      let messages = await questionsChannel.messages.fetch({ limit: 100, after: "0" })
      let preQ = messages
        .filter(message => !message.author.bot)
        .map(message => message.content);
      let Q = messages
        .filter(message => !message.author.bot)
        .map(message => message);
      thisGuildTestData.questionsId.push(
        messages
          .filter(message => !message.author.bot)
          .map(message => message.id)
      );
      for (let a = 0; a < preQ.length; a++) {
        let preline = preQ[a].split(" ")[0];
        let line = preline.split("//");
        if (line.length === 2) {
          thisGuildTestData.questions.push({
            statement: line[0],
            answer: line[1]
          });
        } else {
          Q[a].delete();
        }
      }
      message.channel.send("テストを開始します");
      return
    }
    if ((message.content.startsWith("！テスト途中終了") ||
      message.content.startsWith("!stop")) &&
      thisGuildTestData.testing &&
      message.author.id === thisGuildTestData.user
    ) {
      thisGuildTestData.testing = false;
      thisGuildTestData.questType = 0;
      thisGuildTestData.questions = [];
      thisGuildTestData.tested = [];
      thisGuildTestData.answers = [];
      thisGuildTestData.trueAns = [];
      message.channel.send("テストを途中終了しました");
      return
    }
     if (
      thisGuildTestData.testing && (((message.author.username === "単語帳bot v13" && message.content === "テストを開始します") || message.author.id === thisGuildTestData.user))
    ) {
      if (message.content !== "テストを開始します") {
        thisGuildTestData.answers.push(message.content);
      }
      if (thisGuildTestData.testing &&
        thisGuildTestData.questions.length > thisGuildTestData.tested.length) {
        let ransu = Math.floor(
          Math.random() * thisGuildTestData.questions.length
        );
        while (thisGuildTestData.tested.includes(ransu)) {
          ransu = Math.floor(
            Math.random() * thisGuildTestData.questions.length
          );
        }
        thisGuildTestData.tested.push(ransu);
        if (thisGuildTestData.type == "0") {
          message.channel.send(thisGuildTestData.questions[ransu].statement);
          thisGuildTestData.trueAns.push(thisGuildTestData.questions[ransu].answer);
        } else if (thisGuildTestData.type == "1") {
          message.channel.send(thisGuildTestData.questions[ransu].answer);
          thisGuildTestData.trueAns.push(thisGuildTestData.questions[ransu].statement);
        } else if (thisGuildTestData.type == "2") {
          let r = Math.floor(Math.random() * 2);
          if (r === 0) {
            message.channel.send(thisGuildTestData.questions[ransu].statement);
            thisGuildTestData.trueAns.push(thisGuildTestData.questions[ransu].answer);
          } else {
            message.channel.send(thisGuildTestData.questions[ransu].answer);
            thisGuildTestData.trueAns.push(thisGuildTestData.questions[ransu].statement);
          }
        }
      } else if (
        thisGuildTestData.questions.length ===
        thisGuildTestData.tested.length &&
        thisGuildTestData.testing
      ) {
        if (data.find(d => d.guildid === message.guild.id) === undefined) {
          data.push({ guildid: message.guild.id, data: [] });
        }
        let thisguild = data.find(d => d.guildid === message.guild.id);
        if (
          thisguild.data.find(
            d => d.channelid === thisGuildTestData.channel.id
          ) === undefined
        ) {
          thisguild.data.push({
            channelid: thisGuildTestData.channel.id,
            data: []
          });
        }
        let thisdata = thisguild.data.find(
          d => d.channelid == thisGuildTestData.channel.id
        ).data;
        while (thisdata.length < thisGuildTestData.questions.length) {
          thisdata.push({ s: 0, f: 0 });
        }
        let SoF = "";
        let SoFA = [];
        for (let a = 0; a < thisGuildTestData.questions.length; a++) {
          let q = a + 1;
          if (
            (brackets(thisGuildTestData.answers[a]) ===
              brackets(thisGuildTestData.trueAns[a])) ||
            (thisGuildTestData.answers[a] === thisGuildTestData.trueAns[a])
          ) {
            SoF =
              SoF +
              q +
              "問目:正解(正しい解答:" +
              thisGuildTestData.trueAns[a] +
              "あなたの解答:" +
              thisGuildTestData.answers[a] +
              ")\n";
            SoFA.push(true);
          } else {
            SoF =
              SoF +
              q +
              "問目:不正解(正しい解答:" +
              thisGuildTestData.trueAns[a] +
              "あなたの解答:" +
              thisGuildTestData.answers[a] +
              ")\n";
            SoFA.push(false);
          }
        }
        thisGuildTestData.channel.messages
          .fetch({ after: "0", limit: 1 })
          .then(mesg => {
            let msg = mesg.map(message => message)[0];
            let lines = msg.content.split("\n");
            for (let a = 0; a < SoFA.length; a++) {
              if (SoFA[a]) {
                thisdata[
                  thisdata.length - thisGuildTestData.tested[a] - 1
                ].s += 1;
              } else {
                thisdata[
                  thisdata.length - thisGuildTestData.tested[a] - 1
                ].f += 1;
              }
            }
            //data格納終了
            let ans =
              "「問題文//解答」の形式で100題未満で入力してください\n「!numbering」または「！ナンバリング」で題数を数えられます\n()の中の文字及び括弧自体は質問はされますが解答されなくても正解になります\n";
            for (let a = 0; a < SoFA.length; a++) {
              let per =
                Math.round(
                  (thisdata[a].s * 10000) / (thisdata[a].s + thisdata[a].f)
                ) / 100;
              let b = a + 1;
              let thisline = "問題" + b + ":正答率" + per + "%\n";
              ans = ans + thisline;
            }
            msg.edit(ans);
            message.channel.send("テスト終了\n" + SoF, { split: true });
            thisGuildTestData.testing = false;
            thisGuildTestData.questType = 0;
            thisGuildTestData.questions = [];
            thisGuildTestData.tested = [];
            thisGuildTestData.answers = [];
            thisGuildTestData.trueAns = [];
            thisGuildTestData.channel = null;
            thisGuildTestData.user = null;
          });
      }
    }
    if (message.author.id === "842017764402135071") {
      if (message.content.startsWith("eval\n")) {
        try {
          const before = Date.now()
          let result = eval("(function (){" + message.content.substring(5) + "})()") || "出力なし"
          message.reply("```js\n" + result + "```\n実行時間" + (Date.now() - before) / 1000 + "秒")
        } catch (e) {
          message.reply("```js\n" + e + "```")
        }
        return;
      }
      if (message.content.startsWith("js\n")) {
        let body = message.content.substring(3)
        fs.writeFileSync("run.js", body)
        const before = Date.now()
        exec("node run.js", { timeout: 5000 }, (err, sto, ste) => {
          if (err) {
            message.reply(ste === "" ? "```実行時間が5秒を超えたため強制終了しました" : "```js\n" + ste.substring(51) + "```")
            return
          }
          message.reply("```js\n" + (sto || "出力なし") + "```" + "実行時間:" + (Date.now() - before) / 1000 + "秒")
        })
        return
      }
      if (message.content.startsWith("kt\n")) {
        let body = "fun main(){\n" + message.content.substring(3) + "\n}"
        fs.writeFileSync("run.kt", body)
        let botMsg = await message.reply("trying compile...")
        const before = Date.now()
        exec("chcp 932")
        exec("kotlinc run.kt -include-runtime -d run.jar", { timeout: 60000, encoding: "Shift JIS" }, (err, sto, ste) => {
          if (err) {
            botMsg.edit("```kt\n" + (ste === "" ? "コンパイル時間が60秒を超えたため強制終了しました" : ste) + "```")
            return
          }
          const compileTime = Date.now() - before
          botMsg.edit("compile success")
          const runTime = Date.now()
          exec("java -jar run.jar", { timeout: 10000, encoding: "Shift JIS" }, (err, sto, ste) => {
            console.log(decode(sto, "Shift JIS"))
            if (err) {
              botMsg.edit("```kt\n" + (ste === "" ? "実行時間が10秒を超えたため強制終了しました" : ste) + "```")
              return
            }
            botMsg.edit("```kt\n" + (decode(sto, "Shift JIS") || "出力なし") + "```\n実行時間:" + (Date.now() - runTime) / 1000 + "秒\nコンパイル時間:" + compileTime / 1000 + "秒")
          })
        })
        return
      }
    }
    if (message.content === "!" || message.content === "！") {
      const embed = new discord.MessageEmbed()
        .setTitle("コマンド一覧")
        .setDescription("日本語入力、英語入力に対応しています。日本語入力の場合は区切り文字を読点、英語入力の場合は区切り文字をカンマにしてください。\n詳しい説明はこちらのURLまでhttps://github.com/jinjanow/Vocabulary-Book-Bot#readme\n")
        .setColor(7506394)
        .addField("!mkch(！問題チャンネル作成),__name__", "```新しい問題用チャンネルを作成します```")
        .addField("!start(！テスト開始),__channelName__,__type__", "```channelNameのチャンネルの問題でテストを開始します\ntypeは0~2を半角で入力し、テストの方法を選択します\n0は通常通りに解答します\n1は答えから問題文を解答します\n2は0,1のランダムです```")
        .addField("!stop(!テスト途中終了)", "```テストを途中終了します```")
        .setFooter({ text: "下線部のみ変更してください" })
      message.channel.send({ embeds: [embed] });
    }
  }
});

client.on("guildCreate", guild => {
  guild.channels.create("単語帳bot", { type: "GUILD_CATEGORY" })
    .then(ctg => {
      guild.channels.create("単語帳ターミナル", { parent: ctg.id })
        .then(ch => {
          ch.send("招待ありがとうございます\nこのbotはdiscord上で単語帳のテストをするbotです\nコマンド一覧は「!」で出すことができます")
        })
        .catch(e => console.log(e))
    })
    .catch(e => console.log(e))
});
client.on("ready", () => {
  console.log("bot is running")
})
client.login(process.env.TOKEN);
