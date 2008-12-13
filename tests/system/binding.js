// ========================================================================
// SC.Binding Tests
// ========================================================================

Test.context("basic object binding", {
  
  setup: function() {
    fromObject = SC.Object.create({ value: 'start' }) ;
    toObject = SC.Object.create({ value: 'end' }) ;
    binding = SC.Binding.from("value", fromObject).to("value", toObject).connect() ;
  },
  
  "changing fromObject should mark binding as dirty": function() {
    fromObject.set("value", "change") ;
    assertEqual(binding._changePending, YES) ;
  },
  
  "fromObject change should propogate to toObject only after flush": function() {
    fromObject.set("value", "change") ;
    assertEqual(toObject.get("value"), "end") ;
    SC.Binding.flushPendingChanges() ;
    assertEqual(toObject.get("value"), "change") ;    
  },
  
  "changing toObject should mark binding as dirty": function() {
    toObject.set("value", "change") ;
    assertEqual(binding._changePending, YES) ;
  },

  "toObject change should propogate to fromObject only after flush": function() {
    toObject.set("value", "change") ;
    assertEqual(fromObject.get("value"), "start") ;
    SC.Binding.flushPendingChanges() ;
    assertEqual(fromObject.get("value"), "change") ;    
  }
  
});

Test.context("one way binding", {
  
  setup: function() {
    fromObject = SC.Object.create({ value: 'start' }) ;
    toObject = SC.Object.create({ value: 'end' }) ;
    binding = SC.Binding.from("value", fromObject).to("value", toObject).oneWay().connect() ;
  },
  
  "changing fromObject should mark binding as dirty": function() {
    fromObject.set("value", "change") ;
    assertEqual(binding._changePending, YES) ;
  },
  
  "fromObject change should propogate after flush": function() {
    fromObject.set("value", "change") ;
    assertEqual(toObject.get("value"), "end") ;
    SC.Binding.flushPendingChanges() ;
    assertEqual(toObject.get("value"), "change") ;    
  },
  
  "changing toObject should not make binding dirty": function() {
    toObject.set("value", "change") ;
    assertEqual(binding._changePending, NO) ;
  },

  "toObject change should NOT propogate": function() {
    toObject.set("value", "change") ;
    assertEqual(fromObject.get("value"), "start") ;
    SC.Binding.flushPendingChanges() ;
    assertEqual(fromObject.get("value"), "start") ;    
  }
  
});

Test.context("chained binding", {
  
  setup: function() {
    first = SC.Object.create({ output: 'first' }) ;
    
    second = SC.Object.create({ 
      input: 'second',
      output: 'second',
      
      inputDidChange: function() {
        this.set("output", this.get("input")) ;
      }.observes("input")  
    }) ;
    
    third = SC.Object.create({ input: "third" }) ;

    binding1 = SC.Binding.from("output", first).to("input", second).connect() ;
    binding2 = SC.Binding.from("output", second).to("input", third).connect() ;
  },

  "changing first output should propograte to third after flush": function() {
    
    first.set("output", "change") ;
    assertEqual("change", first.get("output"), "first.output") ;
    assertNotEqual("change", second.get("input"), "second.input") ;
    assertNotEqual("change", second.get("output"), "second.output") ;
    assertNotEqual("change", third.get("input"), "third.input") ;

    SC.Binding.flushPendingChanges() ;
    assertEqual("change", first.get("output"), "first.output") ;
    assertEqual("change", second.get("input"), "second.input") ;
    assertEqual("change", second.get("output"), "second.output") ;
    assertEqual("change", third.get("input"), "third.input") ;
  }
  
});
