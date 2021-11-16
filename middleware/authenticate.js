const JWT = require("jsonwebtoken");
const db = require("../dbConnectExec.js");
const m4thomasConfig = require("../config.js");

const auth = async (req, res, next) => {
  //   console.log("In the middleware", req.header("Authorization"));
  //   next();

  try {
    //1. decode token

    let myToken = req.header("Authorization").replace("Bearer ", "");
    // console.log("token", myToken);

    let decoded = JWT.verify(myToken, m4thomasConfig.JWT);
    console.log(decoded);

    let contactPK = decoded.pk;

    //2. compare token with database
    let query = `SELECT ConsumerID, NameFirst, NameLast, Email
    FROM Consumer
    WHERE ConsumerID = ${contactPK} and token = '${myToken}'`;

    let returnedUser = await db.executeQuery(query);
    console.log("returned user", returnedUser);

    //3. save user information in the request
    if (returnedUser[0]) {
      req.contact = returnedUser[0];
      next();
    } else {
      return res.status(401).send("Invalid credentials");
    }
  } catch (err) {
    console.log(err);
    return res.status(401).send("Invalid credentials");
  }
};

module.exports = auth;
