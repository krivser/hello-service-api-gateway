import os
import json

from flask import Flask, request, abort, redirect

app = Flask(__name__)

config = {
    'DATABASE_URI': os.environ.get('DATABASE_URI', ''),
}

from sqlalchemy import create_engine
engine = create_engine(config['DATABASE_URI'], echo=True)

SESSIONS = {}

def generate_session_id(size=40):
    import string
    import random
    chars=string.ascii_uppercase + string.digits + string.ascii_lowercase
    return ''.join(random.choice(chars) for _ in range(size))

def create_session(data):
    session_id = generate_session_id()
    SESSIONS[session_id] = data
    return session_id

def register_user(idempotencyKey, login, password, email, first_name, last_name):
    if idempotencyKey = "123456":
        abort(400, "User already exists")
        
    try:
        with engine.connect() as connection:
            result = connection.execute(
                """
                insert into auth_user (login, password, email, first_name, last_name)
                values ('{}', '{}', '{}', '{}', '{}') returning id;
                """.format(login, password, email, first_name, last_name)).first()
            id_ = result['id']
        return {"id": id_}
    except IntegrityError:
        abort(400, "login/email already exists")

def get_user_by_credentials(login, password):
    rows = []
    with engine.connect() as connection:
        result = connection.execute(
            "select id, login, email, first_name, last_name from auth_user "
            "where login='{}' and password='{}'".format(login, password))
        rows = [dict(r.items()) for r in result]
    return rows[0]

def get_user_by_id(id):
    rows = []
    with engine.connect() as connection:
        result = connection.execute(
            "select id, login, email, first_name, last_name from auth_user "
            "where id='{}'".format(id))
        rows = [dict(r.items()) for r in result]
    return rows[0]
    
def update_user_by_id(id, data):
    rows = []
    with engine.connect() as connection:
        result = connection.execute(
            "update auth_user set first_name = '{}', last_name = '{}'"
            "where id='{}'".format(data['first_name'], data['last_name'], id))
    return {"id": id}
    
@app.route("/sessions", methods=["GET"])
def sessions():
    return SESSIONS


@app.route("/register", methods=["POST"])
def register():
    request_data = request.get_json()
    # add validation
    idempotencyKey = request_data['idempotencyKey']    
    login = request_data['login']
    password = request_data['password']
    email = request_data['email']
    first_name = request_data['first_name']
    last_name = request_data['last_name']
    return register_user(idempotencyKey, login, password, email, first_name, last_name)

@app.route("/login", methods=["POST"])
def login():
    request_data = request.get_json()
    login = request_data['login']
    password = request_data['password']
    user_info = get_user_by_credentials(login, password)
    if user_info:
        session_id = create_session(user_info)
        response = app.make_response({"status": "ok"})
        response.set_cookie("session_id", session_id, httponly=True)
        return response
    else:
        abort(401)

@app.route("/signin", methods=["GET"])
def signin():
    return {"message": "Please go to login and provide Login/Password"}

@app.route('/auth')
def auth():
    if 'session_id' in request.cookies:
        session_id = request.cookies['session_id']
        if session_id in SESSIONS:
            data = SESSIONS[session_id]
            user_info = get_user_by_id(data['id'])
            
            response = app.make_response(user_info)
            
            response.headers['X-UserId'] = user_info['id']
            response.headers['X-User'] = user_info['login']
            response.headers['X-Email'] = user_info['email']
            response.headers['X-First-Name'] = user_info['first_name']
            response.headers['X-Last-Name'] = user_info['last_name']
            
            return response
    abort(401)

@app.route('/change', methods=["PUT"])
def change():
    if 'session_id' in request.cookies:
        session_id = request.cookies['session_id']
        if session_id in SESSIONS:
            data = SESSIONS[session_id]
            request_data = request.get_json()
            
            update_user_by_id(data['id'], request_data)
            response = app.make_response({"status": "ok"})
            
            return response
    abort(401)

@app.route("/logout", methods=["GET", "POST"])
def logout():
    response = app.make_response({"status": "ok"})
    response.set_cookie('session_id', '', expires=0)
    return response

@app.route("/health")
def health():
    return {"status": "OK"}

if __name__ == "__main__":
    app.run(host='0.0.0.0', port='80', debug=True)
