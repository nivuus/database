/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 25/09/2019
 */

const $lodash = require('lodash');
const $q = require('q-native');

module.exports = class ArrayEntity extends Array {
    constructor (entities) {
        super();
        var self = this;
        $lodash.forEach(entities, (entity) => self.push(entity));
    }

    static get [ Symbol.species ]() {
        return Array;
    }

    static from(type) {
        return {
            type: type,
            collection: true
        };
    }

    toJSON() {
        var json = [];
        return $q.all($lodash.map(this, (entity) => {
            return entity.toJSON()
                .then((result) => json.push(result));
        }))
            .then(() => json);
    }
};