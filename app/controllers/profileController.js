const { check, validationResult } = require('express-validator');
const { validateChangeName, validateChangeEmail } = require('../validation/profile');
const { getBasicUserDetails, updateName, updateEmail } = require('../data/user');


exports.g_profile = async (req, res, next) => {
    try {
        const user = req.session.User;

        const userInfo = await getBasicUserDetails(user.UserID);

        if (userInfo === null) {
            return res.redirect('/auth/sign-out');
        }

        console.log(userInfo);
       
        return res.render('profile/index', {userInfo});
    } catch (error) {
        next(error)
    }
}

exports.g_changeName = async (req, res, next) => {
    try {
        const user = req.session.User;

        const userInfo = await getBasicUserDetails(user.UserID);

        if (userInfo === null) {
            return res.redirect('/auth/sign-out');
        }

        console.log(userInfo);

        return res.render('profile/change-name', { userInfo });
    } catch (error) {
        next(error)
    }
}
exports.g_changeEmail = async (req, res, next) => {
    try {
        const user = req.session.User;

        const userInfo = await getBasicUserDetails(user.UserID);

        if (userInfo === null) {
            return res.redirect('/auth/sign-out');
        }

        console.log(userInfo);

        return res.render('profile/change-email', { userInfo });
    } catch (error) {
        next(error)
    }
}



exports.p_changeName = [
    validateChangeName,
    async (req, res, next) => {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.render('profile/change-name', {
                    errors: errors.array()
                });
            }

            const { firstName, lastName } = req.body;

            // Update existing assessment
            await updateName(firstName, lastName, req.session.User.UserID);

            // Update the session data
            const model = await getBasicUserDetails(req.session.User.UserID);

            req.session.User = model;

            // This could be the first time, and come from an email, so lets see if there is a redirect url

            // if req.session.originalUrl exists
            if (req.session.originalUrl !== undefined) {
                const redirectUrl = req.session.originalUrl
                delete req.session.originalUrl;
                return res.redirect(redirectUrl);
            }

            return res.redirect('/profile');
        } catch (error) {
            next(error)
        }

    }
];

exports.p_changeEmail = [
    validateChangeEmail,
    async (req, res, next) => {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.render('profile/change-email', {
                    errors: errors.array()
                });
            }

            const { emailAddress } = req.body;

            var email = emailAddress.toLowerCase()

            await updateEmail(email, req.session.User.UserID);
            const model = await getBasicUserDetails(req.session.User.UserID);

            req.session.User = model;

            return res.redirect('/profile');
        } catch (error) {
            next(error)
        }
    }
];





