import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';

interface User {
  username: string;
  password: string;
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
  const [users, setUsers] = useState<User[]>([]);
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
    const storedUsers = localStorage.getItem('onlimess-users');
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      const adminUser: User = {
        username: 'skzry',
        password: '568876Qqq',
        email: 'admin@OnliMess',
        displayName: 'Администратор',
        isAdmin: true,
        isFrozen: false,
        hasLoggedIn: false,
      };
      setUsers([adminUser]);
      localStorage.setItem('onlimess-users', JSON.stringify([adminUser]));
    }

    const storedCurrentUser = localStorage.getItem('onlimess-current-user');
    if (storedCurrentUser) {
      setCurrentUser(JSON.parse(storedCurrentUser));
    }

    const storedMessages = localStorage.getItem('onlimess-messages');
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }

    const storedContacts = localStorage.getItem('onlimess-contacts');
    if (storedContacts) {
      setContacts(JSON.parse(storedContacts));
    }
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('onlimess-users', JSON.stringify(users));
    }
  }, [users]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('onlimess-messages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (contacts.length > 0) {
      localStorage.setItem('onlimess-contacts', JSON.stringify(contacts));
    }
  }, [contacts]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('onlimess-current-user', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      const storedMessages = localStorage.getItem('onlimess-messages');
      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages);
        if (parsedMessages.length > messages.length && currentUser) {
          const newMessages = parsedMessages.filter(
            (msg: Message) => 
              msg.to === currentUser.email && 
              !messages.find((m) => m.id === msg.id)
          );
          if (newMessages.length > 0) {
            toast.success('Получено новое сообщение', {
              duration: 3000,
            });
          }
          setMessages(parsedMessages);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [messages, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat]);

  const handleLogin = () => {
    const user = users.find(
      (u) => u.username === loginUsername && u.password === loginPassword
    );

    if (!user) {
      toast.error('Неверный логин или пароль');
      return;
    }

    if (user.isFrozen) {
      toast.error('Профиль заблокирован');
      return;
    }

    if (!user.hasLoggedIn) {
      setShowSetupDialog(true);
      setCurrentUser(user);
    } else {
      setCurrentUser(user);
      toast.success(`Добро пожаловать, ${user.displayName}!`);
    }
  };

  const handleSetupComplete = () => {
    if (!setupName || !setupEmail) {
      toast.error('Заполните все поля');
      return;
    }

    if (!setupEmail.includes('@OnliMess')) {
      toast.error('Email должен быть в домене @OnliMess');
      return;
    }

    const updatedUser = {
      ...currentUser!,
      displayName: setupName,
      email: setupEmail,
      hasLoggedIn: true,
    };

    setUsers(users.map((u) => (u.username === currentUser?.username ? updatedUser : u)));
    setCurrentUser(updatedUser);
    setShowSetupDialog(false);
    toast.success('Профиль настроен!');
  };

  const handleCreateUser = () => {
    if (!newUserLogin || !newUserPassword) {
      toast.error('Заполните все поля');
      return;
    }

    if (users.find((u) => u.username === newUserLogin)) {
      toast.error('Пользователь с таким логином уже существует');
      return;
    }

    const newUser: User = {
      username: newUserLogin,
      password: newUserPassword,
      email: '',
      displayName: '',
      isAdmin: false,
      isFrozen: false,
      hasLoggedIn: false,
    };

    setUsers([...users, newUser]);
    setNewUserLogin('');
    setNewUserPassword('');
    toast.success('Пользователь создан');
  };

  const handleToggleFrozen = (username: string) => {
    setUsers(
      users.map((u) =>
        u.username === username ? { ...u, isFrozen: !u.isFrozen } : u
      )
    );
    toast.success('Статус пользователя обновлён');
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !activeChat || !currentUser) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      from: currentUser.email,
      to: activeChat,
      text: messageText,
      timestamp: Date.now(),
    };

    setMessages([...messages, newMessage]);
    setMessageText('');
    setTypingUsers({ ...typingUsers, [currentUser.email]: false });
  };

  const handleAddContact = () => {
    if (!addContactEmail.includes('@OnliMess')) {
      toast.error('Email должен быть в домене @OnliMess');
      return;
    }

    if (contacts.find((c) => c.email === addContactEmail)) {
      toast.error('Контакт уже добавлен');
      return;
    }

    const user = users.find((u) => u.email === addContactEmail);
    const newContact: Contact = {
      email: addContactEmail,
      displayName: user?.displayName || addContactEmail,
    };

    setContacts([...contacts, newContact]);
    setAddContactEmail('');
    setShowAddContact(false);
    toast.success('Контакт добавлен');
  };

  const handleDeleteChat = (email: string) => {
    setMessages(messages.filter((m) => m.from !== email && m.to !== email));
    if (activeChat === email) {
      setActiveChat(null);
    }
    toast.success('Чат удалён');
  };

  const handleEditContactName = (email: string) => {
    if (!editContactName.trim()) return;
    setContacts(
      contacts.map((c) => (c.email === email ? { ...c, displayName: editContactName } : c))
    );
    setEditingContact(null);
    setEditContactName('');
    toast.success('Имя контакта обновлено');
  };

  const getLastSeen = (email: string) => {
    const user = users.find((u) => u.email === email);
    if (!user) return 'Недавно';
    if (!user.hasLoggedIn) return 'Недавно';
    
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
                localStorage.removeItem('onlimess-current-user');
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
