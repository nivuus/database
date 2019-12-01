/*
 * Copyright 2019 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 25/09/2019
 */

const $lodash = require('lodash');
const $q = require('q-native');

module.exports = class Entity {
    constructor ($database, $manager, data, fields) {
        this._fields = fields || {};
        var self = this;
        $lodash.forEach(this._fields, (field, name) => {
            if (field.type) {
                if (field.type.collection) {
                    self[ name ] = function () {

                    };
                }

            }

        });

        this._database = $database;
        this._manager = $manager;
        this._update(data);
    }

    _update(data) {
        var self = this;
        $lodash.forEach(data, (value, name) => {
            var finalKey = $lodash.camelCase(name);
            /*if (this._manager._joins[ finalKey ])
                entityManagers[this._manager._joins[ finalKey ]].get(value)
                    .then((result) => {
                        self[ finalKey ] = result;
                    })*/
            if (!self._fields[ finalKey ] )
                self._fields[ finalKey ] = {
                    name
                };

            // Try to parse json
            try {
                value = JSON.parse(value);
            } catch (e) { }

            self[ finalKey ] = value;
        });
    }

    $save() {
        var values = [];
        var valueParameters = [];
        var keys = [];

        var self = this;
        var index = 0;
        $lodash.forEach(this._fields, (field, finalKey) => {
            index++;
            var value = self[ finalKey ];

            if ($lodash.isNil(value))
                return;
            else if (Buffer.isBuffer(value)) {
                valueParameters.push(`decode(\$${ index }, 'base64')`);
                value = value.toString('base64');
            }
            else if ($lodash.isObject(value)) {
                valueParameters.push(`\$${ index }`);
                value = JSON.stringify(value);
            }
            else {
                valueParameters.push(`\$${ index }`);
            }

            values.push(value);

            keys.push(field.name);
        });

        var query;

        if (!this.id) {
            query = `INSERT INTO ${ this._manager._table } (${ keys.join(', ') }) VALUES (${ valueParameters.join(', ') });`;
        }
        else {
            var subQuery = [];
            $lodash.forEach(valueParameters, (valueParameter, index) => {
                subQuery.push(`${ keys[ index ] } = ${ valueParameter }`);
            });
            query = `UPDATE ${ this.table } SET ${ subQuery.join(', ') }`;
        }

        return this._database.query({
            text: query,
            values: values
        });
    }

    toJSON() {
        var data = {};
        var self = this;
        return $q.all($lodash.map(this._fields, (config, finalKey) => {
            var value = self[ config.name || finalKey ];
            if ($lodash.isFunction(value))
                value = self[ config.name || finalKey ]();

            var promise = $q.isPromiseLike(value) ? value : $q.resolve(value);

            return promise
                .then((value) => {
                    /*if ($moment.isMoment(value) || value instanceof Date)
                        return value.toISOString();
                    else */if ($lodash.isObject(value) && $lodash.isFunction(value.toJSON))
                        return value.toJSON();
                    return value;
                })
                .then((value) => {
                    data[ finalKey ] = value;
                });

        }))
            .then(() => data);
    }
};