'''
Business: Message management for OnliMess
Args: event with httpMethod, body, headers with X-User-Email
Returns: HTTP response with messages or success status
'''

import json
import os
from typing import Dict, Any
import psycopg2

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Email',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    user_email = event.get('headers', {}).get('x-user-email') or event.get('headers', {}).get('X-User-Email')
    
    if not user_email:
        return {
            'statusCode': 401,
            'headers': headers,
            'body': json.dumps({'error': 'Unauthorized'})
        }
    
    db_url = os.environ.get('DATABASE_URL')
    
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()
        
        if method == 'GET':
            contact_email = event.get('queryStringParameters', {}).get('contact')
            
            if contact_email:
                cur.execute(
                    """SELECT id, from_email, to_email, message_text, timestamp 
                       FROM messages 
                       WHERE (from_email = %s AND to_email = %s) OR (from_email = %s AND to_email = %s)
                       ORDER BY timestamp ASC""",
                    (user_email, contact_email, contact_email, user_email)
                )
            else:
                cur.execute(
                    """SELECT id, from_email, to_email, message_text, timestamp 
                       FROM messages 
                       WHERE from_email = %s OR to_email = %s
                       ORDER BY timestamp ASC""",
                    (user_email, user_email)
                )
            
            messages = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'messages': [{
                        'id': str(m[0]),
                        'from': m[1],
                        'to': m[2],
                        'text': m[3],
                        'timestamp': m[4]
                    } for m in messages]
                })
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            to_email = body_data.get('to')
            message_text = body_data.get('text')
            timestamp = body_data.get('timestamp')
            
            cur.execute(
                """INSERT INTO messages (from_email, to_email, message_text, timestamp) 
                   VALUES (%s, %s, %s, %s)""",
                (user_email, to_email, message_text, timestamp)
            )
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'success': True})
            }
        
        elif method == 'DELETE':
            body_data = json.loads(event.get('body', '{}'))
            contact_email = body_data.get('contact')
            
            cur.execute(
                """DELETE FROM messages 
                   WHERE (from_email = %s AND to_email = %s) OR (from_email = %s AND to_email = %s)""",
                (user_email, contact_email, contact_email, user_email)
            )
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'success': True})
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
