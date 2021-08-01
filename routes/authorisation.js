require('dotenv/config');
const jwt = require("jsonwebtoken");

module.exports.authorise = () => {
    return (req, res, next) => {
        const queryUsername = req.params.username;
        const token = req.headers["authorization"];

        if (!token) {
            return res.status(401).json({
                message: 'Access denied: missing authorisation token.'
            });
        } else {

            const tokenBody = token.slice(7);

            jwt.verify(tokenBody, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).json({
                        message: 'Access denied: unable to verify token.'
                    });
                }
                
                const tokenUsername = decoded.username;
                if (!tokenUsername || tokenUsername !== queryUsername) {
                    return res.status(401).json({
                        message: `Access denied: token does not grant access to ${queryUsername}.`
                    });
                }
                next();
            });
        }
    };
};