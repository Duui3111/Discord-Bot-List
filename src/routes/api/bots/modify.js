const { Router } = require("express");
const bodyParser = require("body-parser");
const is = require('is-html');
const { getUser } = require("@utils/discordApi.js");
const Bots = require("@models/bots");

const { server } = require("@root/config.json");

const route = Router();
route.use(bodyParser.urlencoded({extended: true}));

route.post("/", async (req, res) => {
    let data = req.body;

    
    let user;
    let {refresh_token, access_token} = req.cookies;
    if (!refresh_token) return res.json({ "success": "false", "error": "Invalid token" })

    let result = await getUser({access_token, refresh_token});
    if (!result) return res.redirect("/login");
    [user, {refresh_token, access_token}] = result;
    res.cookie("refresh_token", refresh_token, {httpOnly: true});
    res.cookie("access_token", access_token, {httpOnly: true});
    
    const bot = await Bots.findOne({ botid: data.id }, { _id: false })

    if (!bot) return res.redirect("/error?e=notfound")
    if (user.message === "401: Unauthorized") return res.redirect("/error?e=user")
    if (!bot.owners.includes(user.id) && !server.admin_user_ids.includes(user.id)) return res.redirect(`/error?e=owner`);
    if (bot.botid !== data.id) return res.redirect(`/error?e=id`);
    if (data.description.length >= 120) return res.redirect(`/error?e=long`)
    if (is(data.long) || is(data.description)) return res.redirect(`/error?e=html`);

    let { long, description, link, prefix, supportServer, GithubRepo, Website } = data;
    await Bots.updateOne({ botid: data.id }, {$set: { long, description, link, prefix, supportServer, GithubRepo, Website }})

    req.app.get('client').channels.cache.get(server.mod_log_id).send(`<@${user.id}> has updated <@${bot.botid}>`)
    res.redirect(`/bots/${bot.botid}`);
});

module.exports = route;
