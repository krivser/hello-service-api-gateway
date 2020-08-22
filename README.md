Архитектура решения

![image-20200512154011363](./README.assets/image-20200512154011363.png)



В начале убедиться, что nginx ingress запущен

```
➜  minikube addons  enable ingress
🌟  The 'ingress' addon is enabled
```

Создаем пространства имен для сервиса авторизации
```
➜  kubectl create ns auth
🌟  The 'ingress' addon is enabled
➜  kubectl create ns myapp
🌟  The 'ingress' addon is enabled
```

Создаем пространства имен для сервиса приложения
```
➜  kubectl create ns myapp
🌟  The 'ingress' addon is enabled
```

Собираем и запускаем с помощью helm сервис аутентификации
```bash
➜  cd auth-service
➜  helm install auth-service ./auth-service-chart -n auth
```

Собираем и запускаем с помощью helm приложение, в котором мы будем проверять аутентификацию 
```bash
➜  cd hello-service
➜  helm install hello-service ./hello-service-chart -n myapp
```

Применяем ингресс для сервиса аутентификации 
```bash
➜  kubectl apply -f auth-service-ingress.yaml
```

В файле hello-service-ingress.yaml выставлены настройки аутентификации через аннотации.

auth-url - это урл, который осуществляет проверку на аутентификацию 

Стоит обратить внимание, что урл имеет полное доменное имя внутри кластера (вместе с указанием неймспейса - auth), потому что приложение запущено в другом неймспейсе. 

Также есть указание какие заголовки будут прокидываться в сервис hello-service из сервиса auth.
```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: hello-service-ingress-auth
  annotations:
    nginx.ingress.kubernetes.io/auth-url: "http://auth-service.auth.svc.cluster.local:9000/auth"
    nginx.ingress.kubernetes.io/auth-signin: "http://$host/signin"
    nginx.ingress.kubernetes.io/auth-response-headers: "X-User,X-Email,X-UserId,X-First-Name,X-Last-Name"
spec:
  rules:
  - host: arch.homework
    http:
      paths:
      - path: /users/me
        backend:
          serviceName: hello-service
          servicePort: 8000
```

Применяем ингресс для приложения
```
➜  kubectl apply -f hello-service-ingress.yaml
```

После настройки запускаем тесты с помощью newman и проверяем, что все корректно запустилось
```
➜  newman run PostmanTest.json
```
