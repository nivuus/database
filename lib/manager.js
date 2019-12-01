/*
 * Copyright 2018 Allanic.me ISC License License
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * Created by mallanic <maxime@allanic.me> at 03/12/2018
 */

const $lodash = require('lodash');

var entityManagers = {};
const ArrayEntity = require('./array');
const Entity = require('./entity');

module.exports = class EntityManager {
    constructor ($database, table, entityClass, fields) {

        this._entityClass = entityClass || Entity;
        this._table = table;
        entityManagers[ table ] = this;
        this._database = $database;

        this._name = $lodash.kebabCase(table);

        this._on = {
            'new': [],
            'edit': [],
            'delete': []
        };
        this._cached = {};
        this._listeners = {};
        this._fields = fields || {};
    }

    listen(eventName) {
        var self = this;
        if (this._listeners[ eventName ])
            return;
        this._listeners[ eventName ] = this._database.on(eventName, self._table, (entity) => {
            entity = self.new(entity);

            $lodash.forEach(self._on[ eventName ], function (callback) {
                try {
                    callback(entity);
                } catch (e) {
                    console.error(e);
                }
            });
        });
    }

    new(data) {
        if (data.id && this._cached[ data.id ]) {
            this._cached[ data.id ]._update(data);
            return this._cached[ data.id ];
        }

        return this._cached[ data.id ] = Reflect.construct(this._entityClass, [ this._database, this, data ]);
    }

    on(eventName, callback) {
        if ($lodash.isArray(eventName)) {
            var self = this;
            $lodash.forEach(eventName, (eventName) => {
                self.on(eventName, callback);
            });
            return;
        }
        this._on[ eventName ].push(callback);
        this.listen(eventName);
    }

    executeAndBind(eventName, callback) {
        this.on(eventName, callback);
        return callback();
    }

    watchList() {
        var entities = new ArrayEntity();
        var self = this;

        this.on('new', (entity) => {
            entities.push(entity);
        });
        this.on('edit', (data) => {
            var entity = $lodash.find(entities, { id: data.id });

            if (!data.deletedAt) {
                entity = data;
                entities.push(entity);
            }

            if (entity && data.deletedAt) {
                $lodash.pull(entities, entity);
                if ($lodash.isFunction(entity.close))
                    entity.close();
            }
        });

        this.on('delete', (entity) => {
            var index = $lodash.findIndex(self._entities, { id: entity.id });
            if (index >= 0) {
                entity = entities[ index ];
                $lodash.pullAt(entities, index);
                if ($lodash.isFunction(entity.close))
                    entity.close();
            }
            entities.toJSON()
                .then((json) => $event.emit(`${ self._name }`, json));
        });

        return this.list()
            .then((loadedEntities) => {
                $lodash.forEach(loadedEntities, (entity) => {
                    entities.push(entity);
                });
                return entities;
            });
    }

    list() {
        var self = this;
        return this._database.query(`SELECT * FROM ${ this._table } WHERE deleted_at IS NULL`)
            .then((rows) => {
                return new ArrayEntity($lodash.map(rows, (row) => {
                    return self.new(row);
                }));
            });
    }

    get(id) {
        var self = this;
        if (this._cached[ id ])
            return Promise.resolve(this._cached[ id ]);
        if ($lodash.isString(id))
            id = "'" + id + "'";
        return this._database.query(`SELECT * FROM ${ this._table } WHERE id = ${id} LIMIT 1`)
            .then((rows) => {
                return self.new(rows[ 0 ]);
            });
    }
};
