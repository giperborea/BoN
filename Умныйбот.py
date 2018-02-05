import requests  
import datetime
import random
class BotHandler:
 
    def __init__(self, token):
        self.token = token
        self.api_url = "https://api.telegram.org/bot{}/".format(token)
 
    def get_updates(self, offset=None, timeout=30):
        method = 'getUpdates'
        params = {'timeout': timeout, 'offset': offset}
        resp = requests.get(self.api_url + method, params)
        result_json = resp.json()['result']
        return result_json
 
    def send_message(self, chat_id, text):
        params = {'chat_id': chat_id, 'text': text}
        method = 'sendMessage'
        resp = requests.post(self.api_url + method, params)
        return resp
 
    def get_last_update(self):
        get_result = self.get_updates()
 
        if len(get_result) > 0:
            last_update = get_result[-1]
        else:
            last_update = get_result[len(get_result)]
 
        return last_update

greet_bot = BotHandler('545295349:AAGYgw7rfoy1OoYJYdK5LKLopQeA2FfIvoA')  
greetings = ('hello', 'hi', 'greetings', 'sup','привет','прив','хай','здоров')
greetings1= ('витя лох','витя','лох')
greetings2=('вадим')
greetings3=('кира лох','кира')
greetings4=('кирилл лох','кирилл')
greetings5=('вадим лох')
greetings6=('шутка')
now = datetime.datetime.now()

jokes=['Лично мне клоуны совсем не кажутся смешными. По правде говоря, я их боюсь. Даже не знаю, когда это началось. Наверное, когда меня в детстве повели в цирк и клоун убил моего отца.'
       ,'— Татуся, слышишь?! Ехать не советую… Погода на четыре с минусом… А главное, тут абсолютно нету мужиков… Але! Ты слышишь?! Многие девушки уезжают, так и не отдохнув…'
       ,'Творческая интеллигенция всего мира осудила закрытие Таджикского театра оперы и балета. «Теперь оставшиеся без работы артисты наверняка станут наркоторговцами и наркокурьерами», — уверенно заявляют музыкальные критики.'
       ,'Это маленькие голубые создания, и у каждого из них по пятьдесят рук, так что они — единственный народ во всей Вселенной, который изобрел дезодорант раньше колеса.'
       ,'— Боцман упал за борт, — сообщил мне капитан Трюм. — Отчасти в этом виноват я сам. Это случилось рано утром. Я поднял его на руки, чтобы он получше рассмотрел айсберг, и совершенно случайно, уверяю вас, совершенно случайно уронил за борт. — Капитан Трюм, — осведомился я, — а вы предприняли что-нибудь для его спасения? — Пока еще нет, — смущенно ответил он.'
       ,'Звонок в дверь. Мужик открывает и видит на пороге существо в халате и ластах, с альпенштоком, клоунским носом, картонными крыльями бабочки за спиной и в колпаке с бубенчиками. Мужик, пораженно: — Ты кто? — Я твоя смерть… — О Боже! Какая нелепая смерть!'
       ,'Трампа выдвинули на Нобелевскую премию мира. Потому что он уже год у власти, а так и не начал ни одной новой войны.'
       ,'Детство — это когда ты не паришься из за чьего-то мнения. Тебе просто плевать, обсыпал урода песком и все.'
       ,'В супермаркетах, по большому счету, продается только две вещи - мешки для мусора и мусор для мешков'
       ,'Смотрел я передачу про навозных жуков. Очень интересно! Они почти как люди - насобирают говна, а потом всю жизнь его перед собой катят...'
       ]
jokes1=['Не понел','Да, не услышал, с каждым может случиться','Введите нормальное плз','Не грубите','Сами попробуйте на это ответить','Сори, не услышал, можете повторить?','Шо?','Че? Тихо пишете.'
        ,'Я отойду на секунду, вы пока подумайте.','Нууу, хм.','Да, скорее всего вы правы.','Нууу, впринципе вы правы.','Я не обязан все знать.','Это просто. Подумайте, поможет.']
jokes2=['Бред. ','Я не прав. ','Я все же прав.','Лол. ','Ага)) ','Ну даа. ','Да, скорее всего. ','Это не точно. ','По статистике это не так, хотя... ']
def main():  
    new_offset = None
    today = now.day
    hour = now.hour

    while True:
        greet_bot.get_updates(new_offset)

        last_update = greet_bot.get_last_update()

        last_update_id = last_update['update_id']
        last_chat_text = last_update['message']['text']
        last_chat_id = last_update['message']['chat']['id']
        last_chat_name = last_update['message']['chat']['first_name']
        if len(last_chat_text.lower())>=3:

            if last_chat_text.lower() in greetings and today == now.day and 6 <= hour < 12:
                greet_bot.send_message(last_chat_id, 'Good Morning, {}'.format(last_chat_name))


            elif last_chat_text.lower() in greetings and today == now.day and 12 <= hour < 17:
                greet_bot.send_message(last_chat_id, 'Good Afternoon, {}'.format(last_chat_name))


            elif last_chat_text.lower() in greetings and today == now.day and 17 <= hour < 23:
                greet_bot.send_message(last_chat_id, 'Good Evening, {}'.format(last_chat_name))
        
            elif last_chat_text.lower() in greetings1:
                greet_bot.send_message(last_chat_id, 'Абсолютно верно, Витя лох!')
            elif last_chat_text.lower() in greetings2:
                greet_bot.send_message(last_chat_id, 'Создатель')
            elif last_chat_text.lower() in greetings3:
                greet_bot.send_message(last_chat_id, 'Кира красотка!')
            elif last_chat_text.lower() in greetings4:
                greet_bot.send_message(last_chat_id, 'Ваня лучше!')
            elif last_chat_text.lower() in greetings5:
                greet_bot.send_message(last_chat_id, 'На создателей не ругаются')
            elif last_chat_text.lower() in greetings6:
            
                k=random.randint(0,len(jokes)-1) 
                greet_bot.send_message(last_chat_id, jokes[k])
            else: 
                m=random.randint(0,len(jokes2)-1)
                k=random.randint(0,len(jokes1)-1)
                greet_bot.send_message(last_chat_id, jokes2[m]+jokes1[k])
        else:
            m=random.randint(0,len(jokes2)-1)
            k=random.randint(0,len(jokes1)-1) 
            greet_bot.send_message(last_chat_id, jokes2[m]+jokes1[k])



        new_offset = last_update_id + 1
        
 
if __name__ == '__main__':  
    try:
        main()
    except KeyboardInterrupt:
        exit()

        
