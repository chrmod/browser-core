# to define here all the documentation



# questions
- check all the TODO_QUESTION on the code or TODO:
- we need to implement the popup.js that is the code it will fill the html
  we need to ask how we can do this once we have the design.
  Also how to track this events
- ask how we can get an event when a form is sent (or when a submit button is pressed)
  so we can get a callback (to check if the coupon code is used or not)
- how is better to implement the popup (we need to show the user the coupons and)
  (the users should be able to open the pop up with a list of already shown coupons).
- how to test and debug? show the current way I'm doing it and see if there is a faster
  or better way to do it.
- how to run synchronous resource loading
- why some of the .dbinfo / .rules files (or some in dist/) are not being copied
  to the profile location?.


TO TOMAS:
- how we can store the information in redis using the following formatting (the
  one defined below: grouped by clusters id and then by domains...) There will be
  collisions if we use just cid as key? or for each entity we have our own redis "context".?


TODOS:
- remove the logs everywhere we don't need


# Backend API

## Interface

We want to be able to do the following tasks on the backend:

- [1] get a list of coupons for a particular cluster id
- [2] mark a coupon as used already.
- [3] check if a particular coupon is used

Since we are using the rich header for now we need to encode this in the query parameter:
For each case we will use the following convention:

```
action|arg1=value|arg2=value|....
```

where **action**:
- **get**: for the case [1], with 1 arguments: **cluster_id=cid**.
- **mark_used**: for the case [2] with 1 argument: **coupon_id=id**.
- **is_used**: to check [3] with 1 argument: **coupon_id=id**.


The end points for now will be:
```
http://mixer-beta.clyqz.com/api/v1/rich-header?path=/map&bmresult=vouchers.cliqz.com&q=get|cluster_id=4
```

- bmresult = **vouchers.cliqz.com**

## Results

The results will be a json file with the following information:

```
{
	"results": [{
		"trigger_urls": [],
		"subType": "{\"class\": \"EntityVoucher\", \"ez\": \"deprecated\"}",
		"url": "vouchers.cliqz.com",
		"ts": 1464165279,
		"q": "amazon.de",
		"result_trigger": "url",
		"data": {
			"__subType__": {
				"id": "-3372520458018208663",
				"name": "Vouchers",
				"class": "EntityVoucher"
			},
			"vouchers": {
				domain1: [{full_coupon_info },{full_coupon_info }] // check below for more info how it will look
                ...
			},
			"template": "vouchers",
			"friendly_url": "vouchers.cliqz.com"
		}
	}]
}
```


# Coupon layout

The coupons will contain the following information:

- **cluster_id**: the cluster id to where the coupon belongs.
- **domain_id**: the domain to where the coupon belongs (could be used).
- **coupon_id"**: unique internal coupon id (every coupon should have a unique id).
- **title**: title if we want to put something here.
- **desc**: the description if we have one.
- **image_url**: the url to the image if we have one.
- **redirect_url**: the redirection url where we should move the user to.
- **price**: how much money you can save?

The database of the coupons will be a json file looking like this:

```
{
    cid1: {
        domain1: [{
        	'coupon_id': X-Y-Z,
                'title': the title,
                'desc' : the description,
                'image_url' : http://tosomewhere.com,
                'redirect_url' : http://page_to_the_coupon.com,
                'price' : 5,
            }, {...}]
            ...
        },
        ...
    },
    ...
}
```

We will also have a external table to handle coupons usage (for now a plain one)
that will be

```
coupons_usage : {
    coupon_id1 : True | False,
    ...
}
```

We will change the backend on the future for sure so..
