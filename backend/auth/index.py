'''
Business: Authentication and user management for OnliMess
Args: event with httpMethod, body, queryStringParameters
Returns: HTTP response with user data or error
'''

import json
import os
import hashlib
from typing import Dict, Any
import psycopg2

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Email',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    db_url = os.environ.get('DATABASE_URL')
    
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()
        
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'login':
                username = body_data.get('username')
                password = body_data.get('password')
                password_hash = hash_password(password)
                
                cur.execute(
                    "SELECT email, display_name, is_admin, is_frozen, has_logged_in FROM users WHERE username = %s AND password_hash = %s",
                    (username, password_hash)
                )
                user = cur.fetchone()
                
                if not user:
                    return {
                        'statusCode': 401,
                        'headers': headers,
                        'body': json.dumps({'error': 'Неверный логин или пароль'})
                    }
                
                if user[3]:
                    return {
                        'statusCode': 403,
                        'headers': headers,
                        'body': json.dumps({'error': 'Профиль заблокирован'})
                    }
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'email': user[0],
                        'displayName': user[1],
                        'isAdmin': user[2],
                        'isFrozen': user[3],
                        'hasLoggedIn': user[4]
                    })
                }
            
            elif action == 'setup':
                username = body_data.get('username')
                display_name = body_data.get('displayName')
                email = body_data.get('email')
                
                cur.execute(
                    "UPDATE users SET display_name = %s, email = %s, has_logged_in = TRUE WHERE username = %s",
                    (display_name, email, username)
                )
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'success': True})
                }
            
            elif action == 'create_user':
                username = body_data.get('username')
                password = body_data.get('password')
                password_hash = hash_password(password)
                
                cur.execute(
                    "INSERT INTO users (username, password_hash) VALUES (%s, %s)",
                    (username, password_hash)
                )
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'success': True})
                }
            
            elif action == 'toggle_frozen':
                username = body_data.get('username')
                
                cur.execute(
                    "UPDATE users SET is_frozen = NOT is_frozen WHERE username = %s",
                    (username,)
                )
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'success': True})
                }
        
        elif method == 'GET':
            cur.execute("SELECT username, is_frozen, is_admin FROM users")
            users = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'users': [{'username': u[0], 'isFrozen': u[1], 'isAdmin': u[2]} for u in users]
                })
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
    
    return {
        'statusCode': 405,
        'headers': headers,
        'body': json.dumps({'error': 'Method not allowed'})
    }
