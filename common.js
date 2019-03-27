// Here we take advantage of the difference between var and let: any functions declared with let are helper
//   functions and will not exist in global scope, while those declared with var will be lifted to global scope.
{
    var settings = {
        hidden: {
            title: "Extension"
        }
    };

    // These are the helper functions.

    let colouredLog = (...args) => {
        let colour = args.splice(0, 1);
        let channel = args.splice(0, 1);
        args.splice(1, 0, "background: black; color: white;", "background: auto; color: auto;", "font-weight: bold; background: " + colour + ";", "font-weight: auto; background: auto;");
        args[0] = "%c[" + settings.hidden.title + "]%c %c[" + channel + "]%c " + args[0];
        console.log.apply(null, args);
    };

    // These are functions that use the above helper functions.

    var log = (...args) => {
        args.unshift("#35FF33", "INFO");
        colouredLog.apply(null, args);
    }

    var warn = (...args) => {
        args.unshift("#FFD557", "WARN");
        colouredLog.apply(null, args);
    }

    var error = (...args) => {
        args.unshift("#FF3333", "ERROR");
        colouredLog.apply(null, args);
    }
}

function exists(obj, key = null) {
    return (typeof obj !== "undefined" && obj !== null) &&
        (typeof key === "undefined" || key === null || (typeof obj[key] !== "undefined" && obj[key] !== null));
}

function at(obj, key, def) {
    return exists(obj, key) ? obj[key] : def;
}

Object.defineProperty(Object.prototype, "hasOwnProperties", {
    value: function() {
        for (const key in this) {
            if (this.hasOwnProperty(key)) {
                return true;
            }
        }
        return false;
    }
});