-- Fix admin password hash to match SHA-256('568876Qqq')
UPDATE users 
SET password_hash = '1427b3cf0ff9abf667fc22c0ee9ef1b8a7eaec941d6221c060d9d8210fd254cd' 
WHERE username = 'skzry';
