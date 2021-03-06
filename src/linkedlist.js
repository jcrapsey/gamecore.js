/**
 * gamecore.js - Copyright 2012 Playcraft Labs, Inc. (see licence.txt)
 * linkedlist.js
 * A high-perforance doubly-linked list intended for use in gaming
 */

/**
 * @class gamecore.LinkedNode
 * @extends gamecore.Base
 * Internal node storage class for gamecore.Linkedist
 * @see gamecore.LinkedList
 */
gamecore.LinkedListNode = gamecore.Base('gamecore.LinkedNode', {},
{
    obj: null,          // the object reference
    nextLinked: null,   // link to next object in the list
    prevLinked: null,   // link to previous object in the list
    free: true
});

/**
 * @class gamecore.LinkedList
 * @extends gamecore.Base
 *
 * A high-speed doubly linked list of objects. Note that for speed reasons (using a dictionary lookup of
 * cached nodes) there can only be a single instance of an object in the list at the same time. Adding the same
 * object a second time will result in a silent return from the add method.
 *
 * In order to keep a track of node links, an object must be able to identify itself with a getUniqueId() function.
 *
 * To add an item use:
 * <code>
 *   list.add(newItem);
 * </code>
 *
 * You can iterate using the first and nextLinked members, such as:
 * <code>
 *   var next = list.first;
 *   while (next)
 *   {
 *       next.obj.DOSOMETHING();
 *       next = next.nextLinked;
 *   }
 * </code>
 *
 * Todo: consider moving away from LinkedListNode by adding properties to the contained object that are unique to each
 * list, i.e. clientObj['' + this.uniqueId + '_linkedlist'] or some such. Adding properties feels messy though, and a
 * performance test is needed. The offsetting advantage is we don't need to lookup nodes (probably only a small increase
 * in performance), less memory for large lists and you can place an object in a list more than once (making the prop
 * addition an array?).
 *
 * The other advantage of moving to a property node model would be objects would no longer need to implement a uniqueId
 * to be contained in a list (cleaner).
 */

gamecore.LinkedList = gamecore.Base('gamecore.LinkedList',

    //
    // STATICS
    //
    {
    },
    //
    // INSTANCE
    //
    {
        first:  null,
        last:   null,
        count:  0,
        objToNodeMap: null,   // a quick lookup list to map linked list nodes to objects

        /**
         * Constructs a new linked list
         */
        init: function()
        {
            this._super();
            this.objToNodeMap = new gamecore.Hashtable();
        },

        /**
         * Get the LinkedListNode for this object.
         * @param obj The object to get the node for
         */
        getNode: function(obj)
        {
            // objects added to a list must implement a getUniqueId which returns a unique object identifier string
            // or just extend gamecore.Base to get it for free
            return this.objToNodeMap.get(obj.getUniqueId());
        },

        /**
         * Adds a specific node to the list -- typically only used internally unless you're doing something funky
         * Use add() to add an object to the list, not this.
         */
        addNode: function(obj)
        {
            var node = new gamecore.LinkedNode();
            node.obj = obj;
            node.prevLinked = null;
            node.nextLinked = null;
            node.free = false;
            this.objToNodeMap.put(obj.getUniqueId(), node);
            return node;
        },

        /**
         * Add an item to the list
         * @param obj The object to add
         */
        add: function(obj)
        {
            var node = this.getNode(obj);
            if (node == null)
            {
                node = this.addNode(obj);
            } else
            {
                // if the object is already in the list just return (can't add an object more than once)
                if (node.free == false)
                    throw 'Attempting to add object: ' + obj.getUniqueId() + ' twice to list ' + this.getUniqueId();

                // reusing a node, so we clean it up
                // this caching of node/object pairs is the reason an object can only exist
                // once in a list -- which also makes things faster (not always creating new node
                // object every time objects are moving on and off the list
                node.obj = obj;
                node.free = false;
                node.nextLinked = null;
                node.prevLinked = null;
            }

            // append this obj to the end of the list
            if (this.first == null) // is this the first?
            {
                this.first = node;
                this.last = node;
                node.nextLinked = null; // clear just in case
                node.prevLinked = null;
            } else
            {
                if (this.last == null)
                    throw "Hmm, no last in the list -- that shouldn't happen here";

                // add this entry to the end of the list
                this.last.nextLinked = node; // current end of list points to the new end
                node.prevLinked = this.last;
                this.last = node;            // new object to add becomes last in the list
                node.nextLinked = null;      // just in case this was previously set
            }
            this.count++;

            if (this.showDebug) this.dump('after add');
        },

        /**
         * Removes an item from the list
         * @param obj The object to remove
         */
        remove: function(obj)
        {
            if (this.showDebug) this.dump('before remove of ' + obj);
            var node = this.getNode(obj);
            if (node == null || node.free == true)
                throw ('Error: trying to remove a node (' + obj + ') that isnt on the list ');

            // pull this object out and tie up the ends
            if (node.prevLinked != null)
                node.prevLinked.nextLinked = node.nextLinked;
            if (node.nextLinked != null)
                node.nextLinked.prevLinked = node.prevLinked;

            // fix first and last
            if (node.prevLinked == null) // if this was first on the list
                this.first = node.nextLinked; // make the next on the list first (can be null)
            if (node.nextLinked == null) // if this was the last
                this.last = node.prevLinked; // then this nodes previous becomes last

            node.free = true;
            node.prevLinked = null;
            node.nextLinked = null;

            this.count--;
            if (this.showDebug) this.dump('after remove');
        },

        /**
         * Clears the list out
         */
        clear: function()
        {
            // sweep the list and free all the nodes
            var next = this.first;
            while (next != null)
            {
                next.free = true;
                next = next.nextLinked;
            }
            this.first = null;
            this.count = 0;
        },

        /**
         * Outputs the contents of the current list. Usually for debugging.
         */
        dump: function(msg)
        {
            this.debug('====================' + msg + '=====================');
            var a = this.first;
            while (a != null)
            {
                this.debug("{" + a.obj + "} previous=" + ( a.prevLinked ? a.prevLinked.obj : "NULL"));
                a = a.nextLinked;
            }
            this.debug("===================================");
            this.debug("Last: {" + (this.last ? this.last.obj : 'NULL') + "} " +
                       "First: {" + (this.first ? this.first.obj : 'NULL') + "}");
        }

    });


