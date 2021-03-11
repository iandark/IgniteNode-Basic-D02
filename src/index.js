const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');

const app = express();

app.use(cors());
app.use(express.json());

const users = [];

function checksExistsUserAccount(request, response, next) {
    const { username } = request.headers;

    const user = users.find(user=> user.username  === username);

    if(!user) {
        return response.status(404).json({ error: "User don't exist"});
    }

    request.user = user;

    next();
}

function checksCreateTodosUserAvailability(request, response, next) {
    const { todos, pro } = request.user;

    if(!pro && todos.length>=10) {
        return response.status(403).json({ error: "User todos exceeded"});
    }

    next();
}

function checksTodoExists(request, response, next) {
    const { id } = request.params;
    const { username } = request.headers;

    if(!validate(id)) {
        return response.status(400).json({ error: "Invalid todo"});
    }

    const user = users.find(user=> user.username  === username);
    if(!user) {
        return response.status(404).json({ error: "Invalid user"});
    }

    const { todos } = user;
    const todo = todos.find(todo=> todo.id  === id);

    if(!todo) {
        return response.status(404).json({ error: "This todo don't exist"});
    }

    request.user = user;
    request.todo = todo;

    next();
}

function findUserById(request, response, next) {
    const { id } = request.params;
    const user = users.find(user=> user.id  === id);

    if(!user) {
        return response.status(404).json({ error: "User don't exist"});
    }

    request.user = user;

    next();
}

app.post('/users', (request, response) => {
    const { name, username } = request.body;

    const userAlreadyExist = users.some(user=> user.username  === username);
    if(userAlreadyExist) {
        return response.status(400).json({ "error": "There's a user already in database with this username"});
    }

    const user = {
        id: uuidv4(),
        name,
        username,
        pro: false,
        todos: []
    };

    users.push(user);
    return response.status(201).json(user);
});


app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
    const { title, deadline } = request.body;
    const { todos } = request.user;

    const todo = {
        "created_at": new Date(),
        "deadline": new Date(deadline),
        "done": false,
        "id": uuidv4(),
        "title": title
    }

    todos.push(todo);
    return response.status(201).json(todo);
});

app.put('/todos/:id', checksTodoExists, (request, response) => {
    const { id } = request.params;
    const { title, deadline } = request.body;
    const { user, todo } = request;

    user.todos.find((todo) =>{
      if(todo.id  === id) {
        todo.title = title;
        todo.deadline = deadline;
      }
    });

    return response.status(201).json(todo);
});

app.patch('/todos/:id/done', checksExistsUserAccount, checksTodoExists, (request, response) => {
    const { todo } = request;

    todo.done = true;
    return response.status(201).json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
    const { todos } = request.user;
    const { todo } = request;
    todos.splice(todos.indexOf(todo), 1);

    return response.status(204).json(todos);
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};
