'''
Business: Contact management for OnliMess
Args: event with httpMethod, body, headers with X-User-Email
Returns: HTTP response with contacts or success status
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
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
            cur.execute(
                "SELECT contact_email, display_name FROM contacts WHERE user_email = %s",
                (user_email,)
            )
            contacts = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'contacts': [{'email': c[0], 'displayName': c[1]} for c in contacts]
                })
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            contact_email = body_data.get('email')
            display_name = body_data.get('displayName')
            
            cur.execute(
                """INSERT INTO contacts (user_email, contact_email, display_name) 
                   VALUES (%s, %s, %s) 
                   ON CONFLICT (user_email, contact_email) DO NOTHING""",
                (user_email, contact_email, display_name)
            )
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'success': True})
            }
        
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            contact_email = body_data.get('email')
            display_name = body_data.get('displayName')
            
            cur.execute(
                """UPDATE contacts SET display_name = %s 
                   WHERE user_email = %s AND contact_email = %s""",
                (display_name, user_email, contact_email)
            )
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'success': True})
            }
        
        elif method == 'DELETE':
            body_data = json.loads(event.get('body', '{}'))
            contact_email = body_data.get('email')
            
            cur.execute(
                "DELETE FROM contacts WHERE user_email = %s AND contact_email = %s",
                (user_email, contact_email)
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
