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
    "results": [
        {
            "trigger_urls": [ ],
            "subType": "{\"class\": \"EntityVoucher\", \"ez\": \"deprecated\"}",
            "url": "vouchers.cliqz.com",
            "ts": 1465896897,
            "q": "get|cluster_id=1",
            "result_trigger": "url",
            "data": {
                "__subType__": {
                    "id": "-3372520458018208663",
                    "name": "Vouchers",
                    "class": "EntityVoucher"
                },
                "vouchers": {
                    "29": [
                        {
                            "valid_until": "30.12.2016",
                            "code": "GSH-26-ULI-07",
                            "title": "Holidaycheck",
                            "value": 50,
                            "valid_for": "all",
                            "image_url": "www.holidaycheck.de",
                            "redirect_url": "www.holidaycheck.de",
                            "min_order_value": 700,
                            "cluster_id": 1,
                            "coupon_id": "1-29-0",
                            "domain_id": 29,
                            "desc": "50 Euro geschenkt mit Holidaycheck Gutschein"
                        }
                    ]
                },
                "template": "empty",
                "friendly_url": "vouchers.cliqz.com"
            }
        }
    ]
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
- **value**: how much money you can save?
- **valid_for**: if the coupon is valid for everyone or only new customers
- **min_order_value**: min order value that user has to buy
- **code**: the coupon code
- **valid_until**: how long is the coupon valid

The database of the coupons will be a json file looking like this:

```
{
    cid1: {
        domain1: [{
        	'coupon_id': X-Y-Z,
                valid_until": "30.12.2016",
                "code": "GSH-26-ULI-07",
                "title": "Holidaycheck",
                "value": 50,
                "valid_for": "all",
                "image_url": "www.holidaycheck.de",
                "redirect_url": "www.holidaycheck.de",
                "min_order_value": 700,
                "cluster_id": 1,
                "coupon_id": "1-29-0",
                "domain_id": 29,
                "desc": "50 Euro geschenkt mit Holidaycheck Gutschein"
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


# Telemetry data (signals)

We will gather the information before send it over telemetry in the following way:

```
{
  // the ID for our project goldrush
  type : 'offers',

  // the data itself is easy to parse if we add it into another nested level
  data : {
    cluster\_id: {
      // the number of coupons that the user used (whatever it means) a coupon.
      coupons\_used: N,
      // when another coupon has being used by the user and we couldn't track
      // it for any reason (could be ours or not... most probably not).
      external\_coupons\_used: N,
      // coupons opened (go to offer)
      coupons\_opened: N,
      // when the offer is shown in the same domain where the user is
      same\_domain: N,
      // when the offer is shown in a particular subcluster ({A,B}) if any.
      subcluster\_A: N,
      subcluster\_B: N,
      // the number of coupons rejected by the user (explicitly clicked on not interested)
      coupons\_rejected: N,
      // the number offers closed (the offer is not shown anymore)
      offers\_closed: N,
      // the number offers closed by the user (x button)
      offers\_closed\_by\_user: N,
      // number of offers displayed (could be multiple times the same offer)
      offers\_displayed: N,
      // number of offers created (unique offers, this is created once independently of how many we show)
      offer\_created: N,
      // the number of checkout detected (probably boughts from the user side)
      // this is only one per buying activity (not all the times we detect a checkout page)
      checkouts: N,
      // # of times the system detected a intent
      system_intents: N,
      // the numbers the user visited a particular cluster (everytime we get an event
      // in the givin cluster we increment the counter).
      visits: N,
    },
    ...
  }
}

```

We will sent this information every N seconds (defined in the code) and we will
clear all the data for the next time.



# Things to be improved

- The backend should not be implemented as it is in rich header (should be a proper anonymous
  backend with some how credentials (to avoid mark coupons as used or query raondom
  coupons from outside for example).
- The clusters files should be optimized into one normal format (json with different
  keys, instead of having 4 or N files per cluster).
- Some information could be fetch from the backend (like data bases).
- We can handle errors much better.

