console.log('Loading function');

var aws = require('aws-sdk');
var s3 = new aws.S3({ apiVersion: '2006-03-01' });
var ses =
    new aws.SES({
        accessKeyId: 'AKIAJFBODEFNZWT3PITQ',
        secretAccessKey: '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'});

var MailComposer = require('mailcomposer').MailComposer,
    mailcomposer = new MailComposer();

exports.handler = function(event, context) {
    //console.log('Received event:', JSON.stringify(event, null, 2));

    // Get the object from the event and show its content type
    var bucket = event.Records[0].s3.bucket.name;
    var key = event.Records[0].s3.object.key;
    var params = {
        Bucket: bucket,
        Key: key
    };
    s3.getObject(params, function(err, data) {
        if (err) {
            console.log(err);
            var message = 'error getting object ' + key + ' from bucket ' + bucket;
            console.log(message);
            context.fail(message);
        } else {
            if (key.indexOf('mosaic') > -1 && data.ContentType == 'image/png') {
                console.log('new mosaic image found')

                mailcomposer.setMessageOption({
                    from: 'dominik.s@cliqz.com',
                    to: 'dominik.s@cliqz.com',
                    subject: '[testing] new dropdown screenshots',
                    body: 's3://' + bucket + '/' + key,
                    html: 's3://' + bucket + '/' + key
                });
                var attachment = {
                    contents: data.Body,
                    contentType: 'image/png'
                };
                mailcomposer.addAttachment(attachment);
                mailcomposer.buildMessage(function(err, messageSource){
                    console.log('error: ' + err);
                    console.log('messageSource: ' + messageSource);
                    ses.sendRawEmail({RawMessage: {Data: messageSource}}, function(err, data) {
                        if(err) {
                            console.error('error sending email via SES');
                            console.error(err);
                            context.fail();
                        } else {
                            console.info('email sent via SES');
                            context.done(null, data);
                        }
                    });
                });
            }
        }
    });
};