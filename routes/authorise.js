require('dotenv/config');
const jwt = require("jsonwebtoken");

module.exports = () => {
    return (req, res, next) => {
        console.log("Authorization middleware");
        const queryUsername = req.params.username;
        console.log(queryUsername);

        const token = req.headers["authorization"];
        if (!token) {
            return res.status(401).json({
                message: 'Access denied: missing authorisation token.'
            });
        } else {

            const tokenBody = token.slice(7);

            jwt.verify(tokenBody, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    console.log(`JWT Error: ${err}`);
                    return res.status(401).json({
                        message: 'Access denied: unable to verify token.'
                    });
                }
                const tokenUsername = decoded.username;
                console.log(`decoded: ${tokenUsername}`);
                if (tokenUsername !== queryUsername) {
                    return res.status(401).json({
                        message: `Access denied: token does not grant access to ${queryUsername}.`
                    });
                }
                next();
            });
        }
    };
};