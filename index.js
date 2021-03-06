const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("./dbConnectExec.js");
const m4thomasConfig = require("./config.js");
const auth = require("./middleware/authenticate");

const app = express();
app.use(express.json());

//azurewebsites.net, colostate.edu
app.use(cors());

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`app is running on port ${PORT}`);
});

app.get("/hi", (req, res) => {
  res.send("hello world");
});

app.get("/", (req, res) => {
  res.send("API is running");
});

// app.post()
// app.put()

app.post("/consumer/logout", auth, (req, res) => {
  let query = `UPDATE Consumer
SET Token = NULL 
WHERE ConsumerID = ${req.consumer.ConsumerID}`;

  db.executeQuery(query)
    .then(() => {
      res.status(200).send();
    })
    .catch((err) => {
      console.log("error in POST /consumer/logout", err);
      res.status(500).send();
    });
});

app.post("/review", auth, async (req, res) => {
  try {
    let GameID = req.body.GameID;
    let Recommendation = req.body.Recommendation;
    let rating = req.body.rating;

    if (!GameID || !Recommendation || !rating || !Number.isInteger(rating)) {
      return res.status(400).send("bad request");
    }

    Recommendation = Recommendation.replace("'", "''");

    // console.log("summary", summary);
    // console.log("here is the contact", req.contact);

    let insertQuery = `INSERT INTO Review(Recommendation, Rating, GameID, ConsumerID)
    OUTPUT inserted.ReviewID, inserted.Recommendation, inserted.Rating, inserted.GameID
    VALUES('${Recommendation}', '${rating}', '${GameID}', ${req.contact.ConsumerID})`;

    let insertedReview = await db.executeQuery(insertQuery);
    console.log("inserted review", insertedReview);
    // res.send("here is the response");
    res.status(201).send(insertedReview[0]);
  } catch (err) {
    console.log("error in POST /review", err);
    res.status(500).send();
  }
});

app.get("/contacts/me", auth, (req, res) => {
  res.send(req.contact);
});

app.post("/contacts/login", async (req, res) => {
  // console.log("/contacts/login called", req.body);

  //1. data validation
  let email = req.body.emal;
  let password = req.body.password;

  if (!email || !password) {
    return res.status(400).send("Bad request");
  }

  //2. check that user exists in DB

  let query = `SELECT *
  FROM Consumer
  WHERE Email = '${email}'`;

  let result;
  try {
    result = await db.executeQuery(query);
  } catch (myError) {
    console.log("error in /contacts/login", myError);
    return res.status(500).send();
  }

  // console.log("result", result);

  if (!result[0]) {
    return res.status(401).send("Invalid user credentials");
  }
  //3. check password

  let user = result[0];

  if (!bcrypt.compareSync(password, user.password)) {
    console.log("invalid password");
    return res.status(401).send("Invaild user credentials");
  }

  //4. generate token

  let token = jwt.sign({ pk: user.ConsumerID }, m4thomasConfig.JWT, {
    expiresIn: "60 minutes",
  });
  console.log("token", token);

  //5. save token in DB and send response

  let setTokenQuery = `UPDATE Consumer
  SET token = '${token}'
  WHERE ConsumerID = ${user.ConsumerID}`;

  try {
    await db.executeQuery(setTokenQuery);

    res.status(200).send({
      tokn: token,
      user: {
        nameFirst: user.nameFirst,
        nameLast: user.nameLast,
        email: user.email,
        ConsumerID: user.ConsumerID,
      },
    });
  } catch (myError) {
    console.log("error in setting user token", myError);
    res.status(500).send();
  }
});

app.post("/contacts", async (req, res) => {
  // res.send("/contacts called");

  // console.log("request body", req.body);

  let nameFirst = req.body.nameFirst;
  let nameLast = req.body.nameLast;
  let email = req.body.email;
  let password = req.body.password;

  if (!nameFirst || !nameLast || email || password) {
    return res.status(400).send("Bad request");
  }

  nameFirst = nameFirst.replace("'", "''");
  nameLast = nameLast.replace("'", "''");

  let emailCheckQuery = `SELECT Email
  FROM Consumer
  WHERE Email = '${email}'`;

  let existingUser = await db.executeQuery(emailCheckQuery);

  // console.log("existing user", existingUser);

  if (existingUser[0]) {
    return res.status(409).send("duplicate email");
  }
  let hashedPassword = bcrypt.hashSync(password);

  let insertQuery = `INSERT INTO Consumer(NameFirst, NameLast, Email, Token)
VALUES('${nameFirst}', '${nameLast}', '${email}', '${hashedPassword}')`;

  db.executeQuery(insertQuery)
    .then(() => {
      res.status(201).send();
    })
    .catch((err) => {
      console.log("error in POST /consumer", err);
      res.status(500).send();
    });
});

app.get("/game", (req, res) => {
  //get data from database
  db.executeQuery(
    `SELECT * FROM Games
  LEFT JOIN Genre
  ON Genre.GenreID = Game.GenreID`
  )
    .then((theResults) => {
      res.status(200).send(theResults);
    })
    .catch((myError) => {
      console.log(myError);
      res.status(500).send();
    });
});

app.get("/game/:pk", (req, res) => {
  let pk = req.params.pk;
  // console.log(pk);
  let myQuery = `SELECT * FROM Game
  LEFT JOIN Genre
  ON Genre.GenreID = Game.GenreID
  WHERE GameID = ${pk}`;

  db.executeQuery(myQuery)
    .then((result) => {
      // console.log("result", result);
      if (result[0]) {
        res.send(result[0]);
      } else {
        res.status(404).send(`bad request`);
      }
    })
    .catch((err) => {
      console.log("error in /game/:pk", err);
      res.status(500).send();
    });
});
