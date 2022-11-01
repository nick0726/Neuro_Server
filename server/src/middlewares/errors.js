const errorHandler = async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        ctx.status = err.statusCode || err.status || 500;
        //await Log.error(ctx, err);
        if (ctx.app.env == 'production') delete err.stack; // don't leak sensitive info!
        switch (ctx.status) {
            case 204: // No Content
            case 400:
                ctx.body = { 
                    message: err.message 
                };
                break;
            case 401: // Unauthorized
                ctx.response.set('WWW-Authenticate', 'Basic');
                ctx.body = { 
                    message: err.message 
                };
                break;
            case 403: // Forbidden
            case 404: // Not Found
            case 406: // Not Acceptable
            case 409: // Conflict
                ctx.body = {
                     message: err.message, 
                     description:err.description 
                    };
                break;
            default:
            case 500: // Internal Server Error (for uncaught or programming errors)
                ctx.body = { 
                    message: err.message, 
                    stack: err.stack 
                };
                // ctx.app.emit('error', err, ctx); // github.com/koajs/koa/wiki/Error-Handling
                break;
        }
    }
};

module.exports = {
    errorHandler,
}