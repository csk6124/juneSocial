# 기본 설치 프로그램 

### Rabbitmq for Queue message system
https://www.rabbitmq.com/

# 시스템 구성 

* 메세지 기반으로 구성되어 있다. 
라이브러리로 제공되며, rabbitmq 큐메세지를 이용하여 publish를 하면 이미 등록된 consumer에서 관련된 작업을 처리하게끔 구성되어 있다.
데이타베이스는 mongodb를 사용하며, 먼저 큐에 등록된후에 큐에서 하나씩 디비에 넣는 구조로 구성되어 있다.

# 추가할 기능

* 이미지 업로드, 다운르도, 동영상 업로드, 다운로드 등의 처리
* 변환작업
* 기타등등....  고려중.

# 소셜서비스 배치 라이브러리 설명 

### Facebook
* subscribe가 가능하다. (like, comment, post, share 이벤트를 받아서 처리한다. )
```

@description : facebook subscribe realtime setting lib
@subscribe 정보 https://graph.facebook.com/page_id/subscriptions?access_token=app_token  
@tabs 정보 https://graph.facebook.com/page_id/tabs?app_id=app_id&access_token=app_token
@received realtime page streaming setting 

1. me/accounts 호출하여 page_id, access_token을 값을 가져온다. 
2. 해당 데이타를 통해서 page_id/tabs을 post로 등록처리 한다. 
3. 위의 탭을 등록하지 않은경우 page 이벤트를 받지 못하는 현상이 발생한다.
4. 마지막으로 app_id/subscription으로 page를 등록하는 절차가 필요하다. 
5. 다시 subscription을 호출하여 등록지 됐는지 확인한다. 
6. 페이스북의 page realtime 세팅은 다소 복잡한 과정이 필요하다. 

```

### Twitter
```

subscribe가 가능하다. (reply, favorite, unfavorite, retweet 이벤트를 받아서 처리한다. ) 단, 몇가지 연결 제한이 있다. 
현재는 stream api를 이용하여 user stream을 이용하여 데이타를 수집하고 있다. 단,
connect이 제한이 있으므로, site stream이 언제 가능할지 모르겠지만,  좀더 다양한 방법으로 구성해야 할듯함....  

```

### Youtube
```

subscribe기능이 없음.

```

### 구글 개발 참고 
```

https://console.developers.google.com/project/apps~operating-tiger-515/apiui/api/plus?authuser=0
google + : feed, 댓글, youtube, comments, people, search등을 제공해준다. 

```