import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { API_URLS } from '@/config/api';

interface User {
  username: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  isFrozen: boolean;
  hasLoggedIn: boolean;
}

interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
}

interface Contact {
  email: string;
  displayName: string;
}

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [users, setUsers] = useState<{ username: string; isFrozen: boolean; isAdmin: boolean }[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newUserLogin, setNewUserLogin] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: boolean }>({});
  const [addContactEmail, setAddContactEmail] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [editContactName, setEditContactName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('onlimess-user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      loadContacts(user.email);
      loadMessages(user.email);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      loadMessages(currentUser.email);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentUser, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat]);

  useEffect(() => {
    if (currentUser?.isAdmin) {
      loadUsers();
    }
  }, [currentUser]);

  const loadUsers = async () => {
    try {
      const response = await fetch(API_URLS.auth);
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadContacts = async (userEmail: string) => {
    try {
      const response = await fetch(API_URLS.contacts, {
        headers: {
          'X-User-Email': userEmail,
        },
      });
      const data = await response.json();
      setContacts(data.contacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadMessages = async (userEmail: string) => {
    try {
      const response = await fetch(API_URLS.messages, {
        headers: {
          'X-User-Email': userEmail,
        },
      });
      const data = await response.json();
      
      if (data.messages.length > messages.length) {
        const newMessages = data.messages.filter(
          (msg: Message) => !messages.find((m) => m.id === msg.id)
        );
        if (newMessages.length > 0 && messages.length > 0) {
          toast.success('Получено новое сообщение', {
            duration: 3000,
          });
        }
      }
      
      setMessages(data.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          username: loginUsername,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Ошибка входа');
        return;
      }

      const user: User = {
        username: loginUsername,
        email: data.email,
        displayName: data.displayName,
        isAdmin: data.isAdmin,
        isFrozen: data.isFrozen,
        hasLoggedIn: data.hasLoggedIn,
      };

      if (!data.hasLoggedIn) {
        setShowSetupDialog(true);
        setCurrentUser(user);
      } else {
        setCurrentUser(user);
        localStorage.setItem('onlimess-user', JSON.stringify(user));
        loadContacts(data.email);
        loadMessages(data.email);
        toast.success(`Добро пожаловать, ${data.displayName}!`);
      }
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const handleSetupComplete = async () => {
    if (!setupName || !setupEmail) {
      toast.error('Заполните все поля');
      return;
    }

    if (!setupEmail.includes('@OnliMess')) {
      toast.error('Email должен быть в домене @OnliMess');
      return;
    }

    try {
      const response = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'setup',
          username: currentUser?.username,
          displayName: setupName,
          email: setupEmail,
        }),
      });

      if (!response.ok) {
        toast.error('Ошибка настройки профиля');
        return;
      }

      const updatedUser = {
        ...currentUser!,
        displayName: setupName,
        email: setupEmail,
        hasLoggedIn: true,
      };

      setCurrentUser(updatedUser);
      localStorage.setItem('onlimess-user', JSON.stringify(updatedUser));
      setShowSetupDialog(false);
      loadContacts(setupEmail);
      loadMessages(setupEmail);
      toast.success('Профиль настроен!');
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserLogin || !newUserPassword) {
      toast.error('Заполните все поля');
      return;
    }

    try {
      const response = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_user',
          username: newUserLogin,
          password: newUserPassword,
        }),
      });

      if (!response.ok) {
        toast.error('Ошибка создания пользователя');
        return;
      }

      setNewUserLogin('');
      setNewUserPassword('');
      loadUsers();
      toast.success('Пользователь создан');
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const handleToggleFrozen = async (username: string) => {
    try {
      const response = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle_frozen',
          username: username,
        }),
      });

      if (!response.ok) {
        toast.error('Ошибка обновления статуса');
        return;
      }

      loadUsers();
      toast.success('Статус пользователя обновлён');
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeChat || !currentUser) return;

    const timestamp = Date.now();

    try {
      const response = await fetch(API_URLS.messages, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': currentUser.email,
        },
        body: JSON.stringify({
          to: activeChat,
          text: messageText,
          timestamp: timestamp,
        }),
      });

      if (!response.ok) {
        toast.error('Ошибка отправки сообщения');
        return;
      }

      setMessageText('');
      setTypingUsers({ ...typingUsers, [currentUser.email]: false });
      loadMessages(currentUser.email);
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const handleAddContact = async () => {
    if (!addContactEmail.includes('@OnliMess')) {
      toast.error('Email должен быть в домене @OnliMess');
      return;
    }

    if (contacts.find((c) => c.email === addContactEmail)) {
      toast.error('Контакт уже добавлен');
      return;
    }

    if (!currentUser) return;

    try {
      const response = await fetch(API_URLS.contacts, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': currentUser.email,
        },
        body: JSON.stringify({
          email: addContactEmail,
          displayName: addContactEmail,
        }),
      });

      if (!response.ok) {
        toast.error('Ошибка добавления контакта');
        return;
      }

      setAddContactEmail('');
      setShowAddContact(false);
      loadContacts(currentUser.email);
      toast.success('Контакт добавлен');
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const handleDeleteChat = async (email: string) => {
    if (!currentUser) return;

    try {
      const response = await fetch(API_URLS.messages, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': currentUser.email,
        },
        body: JSON.stringify({
          contact: email,
        }),
      });

      if (!response.ok) {
        toast.error('Ошибка удаления чата');
        return;
      }

      if (activeChat === email) {
        setActiveChat(null);
      }
      loadMessages(currentUser.email);
      toast.success('Чат удалён');
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const handleEditContactName = async (email: string) => {
    if (!editContactName.trim() || !currentUser) return;

    try {
      const response = await fetch(API_URLS.contacts, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': currentUser.email,
        },
        body: JSON.stringify({
          email: email,
          displayName: editContactName,
        }),
      });

      if (!response.ok) {
        toast.error('Ошибка обновления имени');
        return;
      }

      setEditingContact(null);
      setEditContactName('');
      loadContacts(currentUser.email);
      toast.success('Имя контакта обновлено');
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const getLastSeen = (email: string) => {
    const userMessages = messages.filter((m) => m.from === email);
    if (userMessages.length === 0) return 'Недавно';
    
    const lastMessage = userMessages[userMessages.length - 1];
    const now = Date.now();
    const diff = now - lastMessage.timestamp;
    
    if (diff < 60000) return 'В сети';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
    return `${Math.floor(diff / 86400000)} дн назад`;
  };

  const handleTyping = () => {
    if (!currentUser) return;
    setTypingUsers({ ...typingUsers, [currentUser.email]: true });
    setTimeout(() => {
      setTypingUsers({ ...typingUsers, [currentUser.email]: false });
    }, 3000);
  };

  const getContactMessages = (email: string) => {
    return messages.filter(
      (m) =>
        (m.from === currentUser?.email && m.to === email) ||
        (m.from === email && m.to === currentUser?.email)
    );
  };

  if (currentUser?.isFrozen) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center animate-fade-in">
        <div className="text-center p-8 bg-card rounded-xl border border-destructive shadow-2xl animate-bounce-in">
          <Icon name="ShieldAlert" size={64} className="mx-auto mb-4 text-destructive" />
          <h1 className="text-3xl font-bold mb-2">Профиль заблокирован</h1>
          <p className="text-muted-foreground">Обратитесь к администратору</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center animate-fade-in">
        <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-2xl border border-border animate-scale-in">
          <div className="flex items-center justify-center mb-8">
            <Icon name="MessageCircle" size={48} className="text-primary mr-3" />
            <h1 className="text-4xl font-bold">OnliMess</h1>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Логин</label>
              <Input
                placeholder="Введите логин"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Пароль</label>
              <Input
                type="password"
                placeholder="Введите пароль"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="bg-secondary border-border"
              />
            </div>
            <Button onClick={handleLogin} className="w-full" size="lg">
              Войти
            </Button>
          </div>
        </div>

        <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Настройка профиля</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Ваше имя</label>
                <Input
                  placeholder="Введите имя"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email @OnliMess</label>
                <Input
                  placeholder="username@OnliMess"
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <Button onClick={handleSetupComplete} className="w-full">
                Завершить настройку
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background flex overflow-hidden animate-fade-in">
      <div className="w-full md:w-96 bg-card border-r border-border flex flex-col animate-slide-in-left">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-primary">
              <div className="h-full w-full flex items-center justify-center text-primary-foreground font-bold">
                {currentUser.displayName[0]}
              </div>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{currentUser.displayName}</span>
                {currentUser.isAdmin && (
                  <Icon name="BadgeCheck" size={16} className="text-[#1DA1F2]" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{currentUser.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {currentUser.isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAdminPanel(!showAdminPanel)}
              >
                <Icon name="Settings" size={20} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setCurrentUser(null);
                localStorage.removeItem('onlimess-user');
              }}
            >
              <Icon name="LogOut" size={20} />
            </Button>
          </div>
        </div>

        {showAdminPanel && currentUser.isAdmin && (
          <div className="p-4 bg-secondary border-b border-border animate-scale-in">
            <h3 className="font-bold mb-3">Панель администратора</h3>
            <div className="space-y-2 mb-4">
              <Input
                placeholder="Логин нового пользователя"
                value={newUserLogin}
                onChange={(e) => setNewUserLogin(e.target.value)}
                className="bg-background"
              />
              <Input
                type="password"
                placeholder="Пароль"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="bg-background"
              />
              <Button onClick={handleCreateUser} className="w-full" size="sm">
                Создать пользователя
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {users.filter((u) => !u.isAdmin).map((user) => (
                <div
                  key={user.username}
                  className="flex items-center justify-between p-2 bg-background rounded"
                >
                  <span className="text-sm">{user.username}</span>
                  <Button
                    variant={user.isFrozen ? 'default' : 'destructive'}
                    size="sm"
                    onClick={() => handleToggleFrozen(user.username)}
                  >
                    {user.isFrozen ? 'Разморозить' : 'Заморозить'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <Input
              placeholder="Поиск..."
              className="bg-secondary border-border"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowAddContact(true)}
            >
              <Icon name="UserPlus" size={20} />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {contacts.map((contact) => {
              const lastMessage = getContactMessages(contact.email).slice(-1)[0];
              const unreadCount = getContactMessages(contact.email).filter(
                (m) => m.from === contact.email && m.to === currentUser.email
              ).length;

              return (
                <div
                  key={contact.email}
                  className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-secondary mb-1 ${
                    activeChat === contact.email ? 'bg-secondary' : ''
                  }`}
                  onClick={() => setActiveChat(contact.email)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-12 w-12 bg-primary">
                        <div className="h-full w-full flex items-center justify-center text-primary-foreground font-bold">
                          {contact.displayName[0]}
                        </div>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold truncate">{contact.displayName}</span>
                          {lastMessage && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {new Date(lastMessage.timestamp).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          {typingUsers[contact.email] ? (
                            <span className="text-sm text-primary">Печатает...</span>
                          ) : (
                            <p className="text-sm text-muted-foreground truncate">
                              {lastMessage?.text || getLastSeen(contact.email)}
                            </p>
                          )}
                          {unreadCount > 0 && (
                            <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col animate-slide-in-right">
        {activeChat ? (
          <>
            <div className="p-4 border-b border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 bg-primary">
                  <div className="h-full w-full flex items-center justify-center text-primary-foreground font-bold">
                    {contacts.find((c) => c.email === activeChat)?.displayName[0]}
                  </div>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {editingContact === activeChat ? (
                      <Input
                        value={editContactName}
                        onChange={(e) => setEditContactName(e.target.value)}
                        onBlur={() => handleEditContactName(activeChat)}
                        onKeyPress={(e) => e.key === 'Enter' && handleEditContactName(activeChat)}
                        className="h-6 py-0 px-2 text-sm"
                        autoFocus
                      />
                    ) : (
                      <span
                        onClick={() => {
                          setEditingContact(activeChat);
                          setEditContactName(
                            contacts.find((c) => c.email === activeChat)?.displayName || ''
                          );
                        }}
                        className="cursor-pointer hover:text-primary"
                      >
                        {contacts.find((c) => c.email === activeChat)?.displayName}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {typingUsers[activeChat] ? 'Печатает...' : getLastSeen(activeChat)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteChat(activeChat)}
              >
                <Icon name="Trash2" size={20} />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4 bg-[#0a0a0a]">
              <div className="space-y-3">
                {getContactMessages(activeChat).map((msg) => {
                  const isOwn = msg.from === currentUser.email;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-2xl ${
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-secondary text-foreground rounded-bl-sm'
                        }`}
                      >
                        <p className="break-words">{msg.text}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-2">
                <Input
                  placeholder="Написать сообщение..."
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="bg-secondary border-border"
                />
                <Button onClick={handleSendMessage} size="icon">
                  <Icon name="Send" size={20} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]">
            <div className="text-center animate-scale-in">
              <Icon name="MessageSquare" size={64} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-lg">Выберите чат для начала общения</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Добавить контакт</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="email@OnliMess"
              value={addContactEmail}
              onChange={(e) => setAddContactEmail(e.target.value)}
              className="bg-secondary border-border"
            />
            <Button onClick={handleAddContact} className="w-full">
              Добавить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
