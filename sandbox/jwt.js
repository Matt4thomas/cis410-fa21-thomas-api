const jwt = require("jsonwebtoken");

let myToken = jwt.sign({ pk: 289234 }, "secretPassword", {
  expiresIn: "0 minutes",
});
console.log("my token", myToken);

let verificationTest = jwt.verify(myToken, "secretPassword");
console.log("vrification test", verificationTest);
