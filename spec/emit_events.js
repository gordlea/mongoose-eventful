var chai = require('chai').use(require('sinon-chai')),
    expect = chai.expect,
    sinon = require('sinon'),
    mongoose = require('mongoose'),
    eventful = require('./../')


describe('Model with mongoose-eventful plugin', function() {
  before(function(done) {
    mongoose.connect('mongodb://localhost/mongoose-eventful-test', function(err) {
      if (err) {
        console.error('MongoDB: ' + err.message)
        console.error('MongoDB is running? Is it accessible by this application?')
        return done(err)
      }
      mongoose.connection.db.dropDatabase(done)
    })
  })

  after(function(done) {
    mongoose.connection.close(done)
  })

  before(function() {
    this.EventfulSchema = new mongoose.Schema({}).plugin(eventful)
    this.EventfulModel = mongoose.model('EventfulModel', this.EventfulSchema)
  })

  it('emits created when document is created', function(done) {
    var callOnCreated = sinon.spy()
    this.EventfulModel.once('created', callOnCreated)
    this.EventfulModel.create({}, function() {
      expect(callOnCreated).to.have.been.called
      done()
    })
  })

  it('emits removed when document is removed', function(done) {
    var callOnRemoved = sinon.spy()
    this.EventfulModel.once('removed', callOnRemoved)
    this.EventfulModel.create({}, function(err, doc) {
      doc.remove(function(err) {
        expect(callOnRemoved).to.have.been.called
        done()
      })
    })
  })

  it('does not emit changed when document is created', function(done) {
    var callOnChanged = sinon.spy()
    this.EventfulModel.once('changed', callOnChanged)
    this.EventfulModel.create({}, function() {
      expect(callOnChanged).to.not.have.been.called
      done()
    })
  })

  describe('when emitChangedOnCreated option is true', function() {
    before(function() {
      this.EventfulSchema = new mongoose.Schema({}).plugin(eventful, {emitChangedOnCreated: true})
      this.EventfulModel = mongoose.model('EventfulModelWithEmitChangeOnCreatedOption', this.EventfulSchema)
    })

    it('emits changed when document is created', function(done) {
      var callOnChanged = sinon.spy()
      this.EventfulModel.once('changed', callOnChanged)
      this.EventfulModel.create({}, function() {
        expect(callOnChanged).to.have.been.called
        done()
      })
    })
  })

  describe('with a simple field', function() {
    before(function() {
      this.EventfulSchema = new mongoose.Schema({aSimpleField: 'string'}).plugin(eventful)
      this.EventfulModel = mongoose.model('EventfulModelWithSimpleField', this.EventfulSchema)
    })

    it('emits changed event when the field is changed', function(done) {
      var self = this

      self.EventfulModel.create({aSimpleField: 'initial value'}, function(err, doc) {
        self.EventfulModel.once('changed', function(doc) {
          expect(doc.aSimpleField).to.eql('changed value')
          done()
        })
        doc.set('aSimpleField', 'changed value')
        doc.save()
      })
    })

    it('emits changed:<FieldName> when the field is changed', function(done) {
      var self = this

      self.EventfulModel.create({aSimpleField: 'initial value'}, function(err, doc) {
        self.EventfulModel.once('changed:aSimpleField', function(doc) {
          expect(doc.aSimpleField).to.eql('changed value')
          done()
        })
        doc.set('aSimpleField', 'changed value')
        doc.save()
      })
    })

    it('does not emit changed:<FieldName> when document is created', function(done) {
      var callOnChanged = sinon.spy()
      this.EventfulModel.once('changed:aSimpleField', callOnChanged)
      this.EventfulModel.create({aSimpleField: 'initial value'}, function() {
        expect(callOnChanged).to.not.have.been.called
        done()
      })
    })
  })

  describe('with a nested field', function() {
    before(function() {
      this.EventfulSchema = new mongoose.Schema({aNestedField: {aSimpleField: 'string'}}).plugin(eventful)
      this.EventfulModel = mongoose.model('EventfulModelWithNestedField', this.EventfulSchema)
    })

    it('emits changed event when the field is changed', function(done) {
      var self = this

      self.EventfulModel.create({aNestedField: {aSimpleField: 'initial value'}}, function(err, doc) {
        self.EventfulModel.once('changed', function(doc) {
          expect(doc.aNestedField.aSimpleField).to.eql('changed value')
          done()
        })
        doc.set('aNestedField.aSimpleField', 'changed value')
        doc.save()
      })
    })

    it('emits changed:<FieldName>.<FieldName> when the field is changed', function(done) {
      var self = this

      self.EventfulModel.create({aNestedField: {aSimpleField: 'initial value'}}, function(err, doc) {
        self.EventfulModel.once('changed:aNestedField.aSimpleField', function(doc) {
          expect(doc.aNestedField.aSimpleField).to.eql('changed value')
          done()
        })
        doc.set('aNestedField.aSimpleField', 'changed value')
        doc.save()
      })
    })
  })

  describe('with a virtual field', function() {
    describe('when emitChangedOnVirtualFields option is a list of virtual field paths', function() {
      before(function() {
        this.EventfulSchema = new mongoose.Schema(
          {aField: 'string', aSecondField: 'string'}
        )
        this.EventfulSchema.plugin(eventful, {emitChangedOnVirtualFields: 'aVirtualField'})
        this.EventfulSchema.virtual('aVirtualField').get(function() {
          return this.aField
        })
        this.EventfulModel = mongoose.model('EventfulModelWithVirtualField', this.EventfulSchema)
      })

      it('emits changed:<VirtualFieldName> when the virtual field is changed', function(done) {
        this.EventfulModel.once('changed:aVirtualField', function(doc) {
          expect(doc.aVirtualField).to.eql('changed value')
          done()
        })
        this.EventfulModel.create({aField: 'initial value', aSecondField: 'initial value'}, function(err, doc) {
          doc.set('aField', 'changed value')
          doc.save()
        })
      })

      it('emits changed:<VirtualFieldName> when dependent field is changed directly', function(done) {
        this.EventfulModel.once('changed:aVirtualField', function(doc) {
          expect(doc.aVirtualField).to.eql('changed value')
          done()
        })
        this.EventfulModel.create({aField: 'initial value', aSecondField: 'initial value'}, function(err, doc) {
          doc.aField = 'changed value'
          doc.save()
        })
      })

      it('does not emit changed:<VirtualFieldName> if the virtual field is not changed', function(done) {
        var callOnChanged = sinon.spy()
        this.EventfulModel.once('changed:aVirtualField', callOnChanged)
        this.EventfulModel.create({aField: 'initial value', aSecondField: 'initial value'}, function(err, doc) {
          doc.set('aSecondField', 'changed value')
          doc.save(function() {
            expect(callOnChanged).to.not.have.been.called
            done()
          })
        })
      })

      it('does not emit changed:<VirtualFieldName> if nothing changed', function(done) {
        var callOnChanged = sinon.spy()
        this.EventfulModel.once('changed:aVirtualField', callOnChanged)
        this.EventfulModel.create({}, function(err, doc) {
          doc.save(function() {
            expect(callOnChanged).to.not.have.been.called
            done()
          })
        })
      })

      it('does not emit changed:<VirtualFieldName> if nothing changed after creation', function(done) {
        var callOnChanged = sinon.spy()
        this.EventfulModel.once('changed:aVirtualField', callOnChanged)
        this.EventfulModel.create({aField: 'initial value', aSecondField: 'initial value'}, function(err, doc) {
          doc.save(function() {
            expect(callOnChanged).to.not.have.been.called
            done()
          })
        })
      })
    })
  })
})
