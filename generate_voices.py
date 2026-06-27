import os
import urllib.request
import urllib.parse
import time

dialogues = {
    0: {
        "lang": "en",
        "angry": ["I got you!", "Come back here!", "No escape!", "Gotcha!", "Hahaha!", "Muahaha!", "You can't hide!", "I smell fear!", "Turn around!", "Your time is up!", "Don't run!", "I'm right behind you!", "Say your prayers!", "Fresh meat!", "You are mine!", "Peek-a-boo!"],
        "scared": ["Help me!", "Oh no!", "Run away!", "Mercy!", "Aaaahhh!", "Eeeeeek!", "Don't hurt me!", "I'm too young to die!", "Leave me alone!", "Mummy!", "I surrender!", "Not in the face!", "I was just kidding!", "I'm friendly!", "Spare me!", "Time to fly!"],
        "kill": ["Six seven!", "Emotional damage!", "Wasted!", "Get rekt!", "You died!", "GG bro!"],
        "respawn": ["I'm back!", "You will pay!", "Revenge is sweet!", "Round two!", "Miss me?", "I have returned!", "Now it's personal!", "You're going down!", "Vengeance is mine!", "Try that again!"]
    },
    1: {
        "lang": "es",
        "angry": ["¡Te pillé!", "¡Vuelve aquí!", "¡No escaparás!", "¡Cuidado!", "¡Jajaja!", "¡Jejeje!", "¡Corre corre!", "¡Te voy a atrapar!", "¡No te escondas!", "¡Es tu fin!", "¡Ven con mami!", "¡Huele a miedo!", "¡Ya eres mío!", "¡Prepárate!", "¡No puedes huir!", "¡Sorpresa!"],
        "scared": ["¡Ayúdame!", "¡Socorro!", "¡Déjame!", "¡Piedad!", "¡Aaaaah!", "¡Ay ay ay!", "¡No me hagas daño!", "¡Soy muy joven!", "¡Mamá!", "¡Me rindo!", "¡No en la cara!", "¡Era una broma!", "¡Soy bueno!", "¡Perdóname!", "¡A volar!", "¡Paz hermano!"],
        "kill": ["¡Ay caramba!", "¡F en el chat!", "¡Adiós, mi amigo!", "¡Se fue al cielo!", "¡Qué lástima!", "¡Hasta la vista!"],
        "respawn": ["¡He vuelto!", "¡Me las pagarás!", "¡La venganza es mía!", "¡Segundo asalto!", "¡Ya estoy aquí!", "¡Ahora es personal!", "¡Prepárate a sufrir!", "¡Vas a caer!", "¡Inténtalo de nuevo!", "¡Regresé más fuerte!"]
    },
    2: {
        "lang": "pt-BR",
        "angry": ["Te peguei!", "Volte aqui!", "Agora não escapa!", "Achou que ia fugir?", "Hahaha!", "Muhaha!", "Corre negada!", "Vem pro pai!", "Não tem pra onde correr!", "Eu sinto o cheiro do medo!", "Onde você vai?!", "Vai de base!", "Aqui tem coragem!", "Se correr o bicho pega!", "Game over pra você!", "Olha pra trás!"],
        "scared": ["Socorro!", "Deu ruim!", "Ferrou!", "Deixa disso!", "Aaaahhh!", "Eitaaa!", "Não me machuca!", "Sou muito novo pra morrer!", "Chama a polícia!", "Tô brincando!", "Paz e amor!", "Misericórdia!", "Fui!", "Me deixa em paz!", "Salvem-se quem puder!", "Ferrou de vez!"],
        "kill": ["Receba!", "Foi de arrasta pra cima!", "Fez o L!", "Foi de berço!", "Toma na jabiraca!", "Foi de base!"],
        "respawn": ["Voltei!", "A vingança nunca é plena!", "Agora é pessoal!", "Round dois!", "Achou que eu tinha morrido?", "Sinta a minha fúria!", "Você vai me pagar!", "Tô de volta pro jogo!", "Agora você chora!", "Eu sou imortal!"]
    },
    3: {
        "angry": [
            {"text": "待て!", "lang": "ja"},
            {"text": "抓住你了!", "lang": "zh-CN"},
            {"text": "बच नहीं सकते!", "lang": "hi"},
            {"text": "フフフ!", "lang": "ja"},
            {"text": "哈哈哈!", "lang": "zh-CN"},
            {"text": "हाहाहा!", "lang": "hi"},
            {"text": "逃がさないぞ!", "lang": "ja"},
            {"text": "覚悟しろ!", "lang": "ja"},
            {"text": "死ね!", "lang": "ja"},
            {"text": "别跑!", "lang": "zh-CN"},
            {"text": "你跑不掉的!", "lang": "zh-CN"},
            {"text": "受死吧!", "lang": "zh-CN"},
            {"text": "रुक जाओ!", "lang": "hi"},
            {"text": "तुम्हारा खेल खत्म!", "lang": "hi"},
            {"text": "डर लग रहा है?", "lang": "hi"},
            {"text": "見つけたぞ!", "lang": "ja"}
        ],
        "scared": [
            {"text": "助けて!", "lang": "ja"},
            {"text": "救命!", "lang": "zh-CN"},
            {"text": "बचाओ!", "lang": "hi"},
            {"text": "キャー!", "lang": "ja"},
            {"text": "啊啊啊!", "lang": "zh-CN"},
            {"text": "ओह नहीं!", "lang": "hi"},
            {"text": "やめて!", "lang": "ja"},
            {"text": "許して!", "lang": "ja"},
            {"text": "逃げろ!", "lang": "ja"},
            {"text": "不要伤害我!", "lang": "zh-CN"},
            {"text": "我投降!", "lang": "zh-CN"},
            {"text": "放过我吧!", "lang": "zh-CN"},
            {"text": "मुझे छोड़ दो!", "lang": "hi"},
            {"text": "कृपा करो!", "lang": "hi"},
            {"text": "क्षमा करें!", "lang": "hi"},
            {"text": "ごめんなさい!", "lang": "ja"}
        ],
        "kill": [
            {"text": "お前はもう死んでいる!", "lang": "ja"},
            {"text": "六七!", "lang": "zh-CN"},
            {"text": "खत्म!", "lang": "hi"},
            {"text": "やった!", "lang": "ja"},
            {"text": "再见!", "lang": "zh-CN"},
            {"text": "अलविदा!", "lang": "hi"}
        ],
        "respawn": [
            {"text": "ただいま!", "lang": "ja"},
            {"text": "復讐してやる!", "lang": "ja"},
            {"text": "覚悟はいいか!", "lang": "ja"},
            {"text": "我回来了!", "lang": "zh-CN"},
            {"text": "复仇时刻!", "lang": "zh-CN"},
            {"text": "你完蛋了!", "lang": "zh-CN"},
            {"text": "मैं वापस आ गया!", "lang": "hi"},
            {"text": "बदला लूंगा!", "lang": "hi"},
            {"text": "अब तुम्हारी खैर नहीं!", "lang": "hi"},
            {"text": "復活!", "lang": "ja"}
        ]
    },
    4: {
        "lang": "en",
        "spawn": [
            {"text": "Hee hee! Let's dance!", "audioText": "Hee hee! Lets dance!"},
            {"text": "Shamone!", "audioText": "Shamoow!"},
            {"text": "This is it!", "audioText": "This is iiit!"}
        ],
        "angry": [
            {"text": "Beat it!", "audioText": "Just beeat it!"},
            {"text": "Don't stop 'til you get enough!", "audioText": "Dont stop till you get enough!"},
            {"text": "Annie, are you ok?", "audioText": "Annie, are you ok?"}
        ],
        "scared": [
            {"text": "Thriller night!", "audioText": "Cause this is thriller!"},
            {"text": "Billie Jean is not my lover!", "audioText": "Billie Jean is not my lover!"},
            {"text": "Auuu!", "audioText": "Aoooh!"}
        ],
        "kill": [
            {"text": "Smooth criminal!", "audioText": "Smooth criminal!"},
            {"text": "You've been struck by...", "audioText": "You've been struck by!"},
            {"text": "Bad! I'm bad!", "audioText": "Im bad! Im bad!"}
        ],
        "respawn": [
            {"text": "Keep the faith...", "audioText": "Keep the faith!"},
            {"text": "Nooo! Hee hee...", "audioText": "Nooo! Hee hee!"},
            {"text": "Gone too soon...", "audioText": "Gone too soon..."}
        ]
    },
    5: {
        "lang": "it",
        "spawn": [
            {"text": "It's a-me, Mario!", "audioText": "Itz a mi, Mario!"},
            {"text": "Let's a-go!", "audioText": "Lets a go!"},
            {"text": "Mamma mia!", "audioText": "Mamma mia!"}
        ],
        "angry": [
            {"text": "Here we go!", "audioText": "Here we go!"},
            {"text": "Oki doki!", "audioText": "Oki doki!"},
            {"text": "Wahoo!", "audioText": "Wa huu!"}
        ],
        "scared": [
            {"text": "Oh no! Mamma mia!", "audioText": "Oh no! Mamma mia!"},
            {"text": "Mama, help-a me!", "audioText": "Mama, help a mi!"},
            {"text": "Wahhhhh!", "audioText": "Wa ah ah!"}
        ],
        "kill": [
            {"text": "So long-a Bowser!", "audioText": "So long a Bowser!"},
            {"text": "Oh yeah, Mario time!", "audioText": "Oh yeaa, Mario time!"},
            {"text": "You-a finished!", "audioText": "You a finished!"}
        ],
        "respawn": [
            {"text": "Arrivederci!", "audioText": "Arrivederci!"},
            {"text": "I'm-a tired...", "audioText": "Im a tired..."},
            {"text": "Game over!", "audioText": "Game over!"}
        ]
    }
}

os.makedirs("audio/voices", exist_ok=True)

def download_tts(text, lang, filename):
    url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(text)}&tl={lang}&client=tw-ob"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response, open(filename, 'wb') as out_file:
            out_file.write(response.read())
        print(f"Saved {filename}")
        time.sleep(1) # Be nice to Google API
    except Exception as e:
        print(f"Error on {filename}: {e}")

for ghost_id, states in dialogues.items():
    for state, phrases in states.items():
        if state == "lang": continue
        for i, phrase in enumerate(phrases):
            lang = states.get("lang")
            text = phrase
            if isinstance(phrase, dict):
                lang = phrase.get("lang", lang)
                text = phrase.get("audioText", phrase.get("text", phrase))
            
            filename = f"audio/voices/ghost_{ghost_id}_{state}_{i}.mp3"
            if not os.path.exists(filename):
                download_tts(text, lang, filename)
            else:
                pass # print(f"Skipped {filename}")
