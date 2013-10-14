
var xmpp = require ('node-xmpp');
var dict = require ('dict');
var _ = require ('underscore');

var WYLIODRIN_NAMESPACE = "wyliodrin";

xmpp.Client.prototype.load = function ()
{
	t = this;

	this.on ('iq', function (stanza)
	{
		var p = stanza.getChild ('ping', 'urn:xmpp:ping');
		console.log ('stanza');
		if (p && p.type == 'get')
		{
			console.log ('ping');
			t.send (new xmpp.Element ('iq', {to:p.attrs.from, type:'result', id:p.attrs.id}).c('ping', {xmlns:'urn:xmpp:ping'}));
		}
	});

	this.on ('stanza', function (stanza)
	{
		console.log (stanza.root().toString());
		if (stanza.is('iq'))
		{
			var p = stanza.getChild ('ping');
			// console.log (stanza);
			if (p && stanza.type == 'get')
			{
				console.log ('ping');
				t.send (new xmpp.Element ('iq', {to:p.attrs.from, type:'result', id:p.attrs.id}).c('ping', {xmlns:'urn:xmpp:ping'}));
			}
		}
		else
		if (stanza.is('message'))
		{
			_.each (stanza.children, function (es)
			{
				// console.log (es);
				if (es.getNS() == WYLIODRIN_NAMESPACE)
				{
					var name = es.getName ();
					// console.log (name);
					var error = stanza.attrs.type == 'error';
					if (t.tags().has(name)) t.tags().get(name)(t, stanza.attrs.from, stanza.attrs.to, es, error);
				}
			});
		}
	});
}

xmpp.Client.prototype.tags = function ()
{
	if (_.isUndefined (this.tagslist)) this.tagslist = dict ();
	return this.tagslist;
}

xmpp.Client.prototype.tag = function (name, namespace, activity)
{
	this.tags().set (name, activity);
}

xmpp.Client.prototype.sendWyliodrin = function (to, stanza)
{
	stanza.attrs.xmlns = WYLIODRIN_NAMESPACE;
	this.send (new xmpp.Element ('message', {to: to}).cnode(stanza));
}

exports.xmpp = xmpp;
exports.WYLIODRIN_NAMESPACE = WYLIODRIN_NAMESPACE;

