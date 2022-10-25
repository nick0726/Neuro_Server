/**
 * Extent Error with UserError which includes (http)status.
 * 
 * @param {Number} status - HTTP status for API return status.
 * @param {string} message - Message associated with error.
 */
class UserError extends Error{
    constructor(status, message){
        super(message);
        this.name = this.constructor.name;
        this.status = status;
    }
}

export default UserError;