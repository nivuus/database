/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 25/09/2019
 */

const $lodash = require('lodash');

module.exports.Repositories = class Repositories {
    constructor (database) {
        this._database = database;
    }

    add(tableName, repository, entity) {
        this[ $lodash.camelCase(tableName) + 's' ] = new repository(this._database, tableName, entity);
    }
}

module.exports.Entity = require('./entity');
module.exports.ArrayEntity = require('./array');
module.exports.EntityManager = require('./manager');
