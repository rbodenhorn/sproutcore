// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple, Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/enumerable') ;
sc_require('mixins/array') ;
sc_require('mixins/observable') ;
sc_require('mixins/delegate_support') ;

/**
  @class

  A dynamically filled array.  A SparseArray makes it easy for you to create 
  very large arrays of data but then to defer actually populating that array
  until it is actually needed.  This is often much faster than generating an
  array up front and paying the cost to load your data then.
  
  Although technically all arrays in JavaScript are "sparse" (in the sense 
  that you can read and write properties are arbitrary indexes), this array
  keeps track of which elements in the array have been populated already 
  and which ones have not.  If you try to get a value at an index that has 
  not yet been populated, the SparseArray will notify a delegate object first
  giving the delegate a chance to populate the component.
  
  Most of the time, you will use a SparseArray to incrementally load data 
  from the server.  For example, if you have a contact list with 3,000
  contacts in it, you may create a SparseArray with a length of 3,000 and set
  that as the content for a ListView.  As the ListView tries to display the
  visible contacts, it will request them from the SparseArray, which will in
  turn notify your delegate, giving you a chance to load the contact data from
  the server.
  
  @extends SC.Enumerable
  @extends SC.Array
  @extends SC.Observable
  @extends SC.DelegateSupport
  @since SproutCore 1.0
*/

SC.SparseArray = SC.Object.extend(SC.Observable, SC.Enumerable, SC.Array, 
  SC.DelegateSupport, /** @scope SC.SparseArray.prototype */ {  

  // ..........................................................
  // LENGTH SUPPORT
  // 
  
  /**
    The length of the sparse array.  The delegate for the array should set 
    this length.
    
    @property {Number}
  */
  length: function() {
    var del = this.delegate ;
    if (del && SC.none(this._length) && del.sparseArrayDidRequestLength) {      
      del.sparseArrayDidRequestLength(this);
    }
    return this._length || 0 ;
  }.property().cacheable(),

  /**
    Call this method from a delegate to provide a length for the sparse array.
    If you pass null for this property, it will essentially "reset" the array
    causing your delegate to be called again the next time another object 
    requests the array length.
  
    @param {Number} length the length or null
    @returns {SC.SparseArray} receiver
  */
  provideLength: function(length) {
    if (SC.none(length)) this._sa_content = null ;
    if (length !== this._length) {
      this._length = length ;
      this.enumerableContentDidChange() ;
    }
    return this ;
  },
  
  // ..........................................................
  // READING CONTENT 
  // 

  /** 
    The minimum range of elements that should be requested from the delegate.
    If this value is set to larger than 1, then the sparse array will always
    fit a requested index into a range of this size and request it.
    
    @property {Number}
  */
  rangeWindowSize: 1,
  
  /** 
    Returns the object at the specified index.  If the value for the index
    is currently undefined, invokes the didRequestIndex() method to notify
    the delegate.
    
    @param  {Number} idx the index to get
    @return {Object} the object
  */
  objectAt: function(idx) {
    var content = this._sa_content, ret ;
    if (!content) content = this._sa_content = [] ;
    if ((ret = content[idx]) === undefined) {
      this.requestIndex(idx);
      ret = content[idx]; // just in case the delegate provided immediately
    }
    return ret ;
  },

  _TMP_RANGE: {},
  
  /**
    Called by objectAt() whenever you request an index that has not yet been
    loaded.  This will possibly expand the index into a range and then invoke
    an appropriate method on the delegate to request the data.
    
    @param {SC.SparseArray} receiver
  */
  requestIndex: function(idx) {
    var del = this.delegate;
    if (!del) return this; // nothing to do
    
    // adjust window
    var len = this.get('rangeWindowSize'), start = idx;
    if (len > 1) start = Math.floor(start / windowSize);
    if (len < 1) len = 1 ;
    
    // invoke appropriate callback
    if (del.sparseArrayDidRequestRange) {
      var range = this._TMP_RANGE;
      range.start = start;
      range.length = len;
      del.sparseArrayDidRequestRange(this, range);
      
    } else if (del.sparseArrayDidRequestIndex) {
      while(--len >= 0) del.sparseArrayDidRequestIndex(start + len);
    }
    return this ;
  },
  
  /**
    This method sets the content for the specified to the objects in the 
    passed array.  If you change the way SparseArray implements its internal
    tracking of objects, you should override this method along with 
    objectAt().
    
    @param {Range} range the range to apply to
    @param {Array} array the array of objects to insert
    @returns {SC.SparseArray} reciever
  */
  provideObjectsInRange: function(range, array) {
    var content = this._sa_content ;
    if (!content) content = this._sa_content = [] ;
    var start = range.start, len = range.length;
    while(--len >= 0) content[start+len] = array[len];
    this.enumerableContentDidChange() ;
    return this ;
  },

  _TMP_PROVIDE_ARRAY: [],
  _TMP_PROVIDE_RANGE: { length: 1 },
  
  /**
    Convenience method to provide a single object at a specified index.  Under
    the covers this calls provideObjectsInRange() so you can override only 
    that method and this one will still work.
    
    @param {Number} index the index to insert
    @param {Object} the object to insert
    @return {SC.SparseArray} receiver
  */
  provideObjectAtIndex: function(index, object) {
    var array = this._TMP_PROVIDE_ARRAY, range = this._TMP_PROVIDE_RANGE;
    array[0] = object;
    range.start = index;
    return this.provideObjectsInRange(range, array);
  },

  /**
    Invalidates the array content in the specified range.  This is not the 
    same as editing an array.  Rather it will cause the array to reload the
    content from the delegate again when it is requested.
    
    @param {Range} the range
    @returns {SC.SparseArray} receiver
  */
  objectsDidChangeInRange: function(range) {

    // delete cached content
    var content = this._sa_content ;
    if (content) {
      // if range covers entire length of cached content, just reset array
      if (range.start === 0 && SC.maxRange(range)>=content.length) {
        this._sa_content = null ;
        
      // otherwise, step through the changed parts and delete them.
      } else {
        var start = range.start, loc = Math.min(start + range.length, content.length);
        while (--loc>=start) content[loc] = undefined;
      }
    }    
    this.enumerableContentDidChange(range) ; // notify
    return this ;
  },
  
  /**
    Optimized version of indexOf().  Asks the delegate to provide the index 
    of the specified object.  If the delegate does not implement this method
    then it will search the internal array directly.
    
    @param {Object} obj the object to search for
    @returns {Number} the discovered index or -1 if not found
  */
  indexOf: function(obj) {
    var del = this.delegate ;
    if (del && del.sparseArrayDidRequestIndexOf) {
      return del.del.sparseArrayDidRequestIndexOf(this, obj);
    } else {
      var content = this._sa_content ;
      if (!content) content = this._sa_content = [] ;
      return content.indexOf(obj) ;
    }
  },  
  
  // ..........................................................
  // EDITING
  // 

  /**
    Array primitive edits the objects at the specified index unless the 
    delegate rejects the change.
    
    @param {Number} idx the index to begin to replace
    @param {Number} amt the number of items to replace
    @param {Array} objects the new objects to set instead
    @returns {SC.SparseArray} receiver
  */
  replace: function(idx, amt, objects) {
    objects = objects || [] ;

    // if we have a delegate, get permission to make the replacement.
    var del = this.delegate ;
    if (del) {
      if (!del.sparseArrayShouldReplace || 
          !del.sparseArrayShouldReplace(this, idx, amt, objects)) {
            return this;
      }
    }

    // go ahead and apply to local content.
    var content = this._sa_content ;
    if (!content) content = this._sa_content = [] ;
    content.replace(idx, amt, objects) ;
    
    // update length
    var delta = objects.length - amt ;
    if (delta!==0 && !SC.none(this._length)) {
      this.propertyWillChange('length');
      this._length += delta;
      this.propertyDidChange('length');
    } 

    this.enumerableContentDidChange() ;
    return this ;
  },

  /** 
    Resets the SparseArray, causing it to reload its content from the 
    delegate again.
  */
  reset: function() {
    this._sa_content = null ;
    this._length = null ;
    this.enumerableContentDidChange() ;
    this.invokeDelegateMethod(this.delegate, 'sparseArrayDidReset', this);
    return this ;
  }
      
}) ;

SC.SparseArray.array = function(len) {
  return this.create({ _length: len||0 });
};
