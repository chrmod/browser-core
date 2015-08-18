function GoogleAPI() {
    var _this = this,
        url = "https://accounts.google.com/o/oauth2/auth?"
            + "scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.readonly&"
            + "state=%2Fprofile&"
            + "redirect_uri=https%3A%2F%2Foauth.freshtab.cliqz.com%2Fchrome&"
            + "response_type=token&"
            + "client_id=624577338266-t11bgo04s73c1fh7gmpbaeuqjglod02u.apps.googleusercontent.com"

    this.token = env.get("oauth-google-token")

    this.oauth2 = function(){
        window.location.href = url
    }

    this.refresh = function(){
        return $.pget(url)
    }

    this.validate = function(){
        return $.pget("https://www.googleapis.com/oauth2/v1/tokeninfo",{ access_token: _this.token },null,"json")
                .then(function(data){
                    return new Promise(function(resolve,reject){
                        console.log("%c GMAIL: Google token expires in %s seconds","color: #bada55",data.expires_in)

                        if (data.expires_in) resolve(data)
                        else reject(data)
                    })
                })
    }

    this.gmailUnread = function(){
        return this.validate().then(function(data){
            return $.pget("https://www.googleapis.com/gmail/v1/users/me/messages",{ q: "is:unread", access_token: _this.token })
                    .then(function(data){
                        return new Promise(function(resolve,reject){
                            resolve(data.resultSizeEstimate)
                        })
                    })
        })
    }
}
