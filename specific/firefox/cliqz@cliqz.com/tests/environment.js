var ENGINES = [
    {
        "name": "Google",
        "alias": "",
        "icon": "data:image/x-icon;base64,AAABAAIAEBAAAAAAAAB9AQAAJgAAACAgAAAAAAAA8gIAAKMBAACJUE5HDQoaCgAAAA1JSERSAAAAEAAAABAIBgAAAB/z/2EAAAFESURBVDjLpZNJSwNBEIXnt4lE4kHxovgT9BDwJHqPy0HEEOJBiAuCRg+KUdC4QS4KrpC4gCBGE3NQ48JsnZ6eZ3UOM6gjaePhQU93v6+qq2q0pqgeJj2S8EdJT1hr0OxBtKCD5iEd8QxDYpvhvOBAuMDKURX9C9aPu4GA1GEVkzvMg10UBfYveWAWgYAP00V01fa+R9M2bA51wJvhIn3qR+ybt3D3JNQBE5sMjCIOLFpoHzOwdsLRO22qA6R6kiZiWwxUvy/PUQZIhYZ1vFM9cvcOOsYNdcBgysISdSJBnZjJMlR0Fw8vAp0xoz5gao/h+NZBy4i/10XGwrPA+hmvDyhVRG2Avu/LwcrkFADZa16L1h330w1RNgc3DiJzCpPYRm1bpveXX11clQR28xwblHpk1vq1iP/5mcoS0CoXDZiL0vsJ+dzfl+3T/VYAAAAASUVORK5CYIKJUE5HDQoaCgAAAA1JSERSAAAAIAAAACAIBgAAAHN6evQAAAK5SURBVFjDxVfrSxRRFJ9/Jta/oyWjF5XQm6D6EkHRgygIIgjUTcueVgqVWSRRkppEUQYWWB8ye1iGWilWlo/Ude489s7M6Zw7D9dlt53dmd29cFiWvXvO77x+51xpaaUsoSxBaUWZQ4ECy5xji2xKZDyCMlMEw6lCNiOSgwZKJK1SkcKeSealfP64t0mBjl4Ow39MkDUL0p2RSROOtqhZdeUEYM1pBl39XCg/fEeFtWcY7G9W4csvUxjlBkCsQ4Nt9QyWVfvT6RsAKXw3aoDGATZeYIt+W1kjw7cJG0RctWDTRebbKd8A6h5pwsDb70ba3w/eUr3wt/cmwgfw6Yft4TNMQaY7o1P2ncm4FT4ANQH/jQBJ2xv7kqIXEADDql8eS3+n8bku7oxNm+EDIM/dU92upb3T/NJGeaNbDx/AsbsLRUY5Xn92caWXY5d8RV6gWllxSg4fAEnTC90DQW13BLlgXR2D3dcUeDVkwOthA1bXspxILWcm3HdThcfvufB26LcJpkOEAz9NKI/lzqpSEC7feol5EWnpSeSlIxCALUkApmULdjUqxQVAQnl3D/X/yQda4QBEq2TYc12By091MQ17Bg3R88nHKlQbVmHvj89awNBLYrwT9zXY2aBAxTkGFdiSxP/Jp6FLDw+AS7GfsdJTJ2EqSO5khD43nGfBARy/ZxOQgZHe7GPM1jzUvChUtmnBAXQPcKGMJp3fdFGq6NByEhiAO4b/YptFfQJwNyQ/bZkVQGcf90Ja25ndIyrKBOa/f8wIpwi3X1G8UcxNu7ozUS7tiH0jBswwS3RIaF1w6LYKU/ML2+8sGnjygQswtKrVIy/Qd9qQP6LnO64q4fPAKpxyZIymHo1jWk6p1ag2BsdNwQMHcC+M5kHFJX+YlPxpVlbCx2mZ5DzPI04k4kUwHHdskU3pH76iftG8yWlkAAAAAElFTkSuQmCC",
        "code": 3,
        "searchForm": "https://www.google.com/search?q=&ie=utf-8&oe=utf-8"
    },
    {
        "name": "Bing",
        "alias": "#bi",
        "icon": "data:image/x-icon;base64,AAABAAIAEBAAAAEACADaCwAAJgAAACAgAAABAAgAlAIAAAAMAACJUE5HDQoaCgAAAA1JSERSAAAAEAAAABAIAgAAAJCRaDYAAAAJcEhZcwAACxMAAAsTAQCanBgAAApPaUNDUFBob3Rvc2hvcCBJQ0MgcHJvZmlsZQAAeNqdU2dUU+kWPffe9EJLiICUS29SFQggUkKLgBSRJiohCRBKiCGh2RVRwRFFRQQbyKCIA46OgIwVUSwMigrYB+Qhoo6Do4iKyvvhe6Nr1rz35s3+tdc+56zznbPPB8AIDJZIM1E1gAypQh4R4IPHxMbh5C5AgQokcAAQCLNkIXP9IwEA+H48PCsiwAe+AAF40wsIAMBNm8AwHIf/D+pCmVwBgIQBwHSROEsIgBQAQHqOQqYAQEYBgJ2YJlMAoAQAYMtjYuMAUC0AYCd/5tMAgJ34mXsBAFuUIRUBoJEAIBNliEQAaDsArM9WikUAWDAAFGZLxDkA2C0AMElXZkgAsLcAwM4QC7IACAwAMFGIhSkABHsAYMgjI3gAhJkAFEbyVzzxK64Q5yoAAHiZsjy5JDlFgVsILXEHV1cuHijOSRcrFDZhAmGaQC7CeZkZMoE0D+DzzAAAoJEVEeCD8/14zg6uzs42jrYOXy3qvwb/ImJi4/7lz6twQAAA4XR+0f4sL7MagDsGgG3+oiXuBGheC6B194tmsg9AtQCg6dpX83D4fjw8RaGQudnZ5eTk2ErEQlthyld9/mfCX8BX/Wz5fjz89/XgvuIkgTJdgUcE+ODCzPRMpRzPkgmEYtzmj0f8twv//B3TIsRJYrlYKhTjURJxjkSajPMypSKJQpIpxSXS/2Ti3yz7Az7fNQCwaj4Be5EtqF1jA/ZLJxBYdMDi9wAA8rtvwdQoCAOAaIPhz3f/7z/9R6AlAIBmSZJxAABeRCQuVMqzP8cIAABEoIEqsEEb9MEYLMAGHMEF3MEL/GA2hEIkxMJCEEIKZIAccmAprIJCKIbNsB0qYC/UQB00wFFohpNwDi7CVbgOPXAP+mEInsEovIEJBEHICBNhIdqIAWKKWCOOCBeZhfghwUgEEoskIMmIFFEiS5E1SDFSilQgVUgd8j1yAjmHXEa6kTvIADKC/Ia8RzGUgbJRPdQMtUO5qDcahEaiC9BkdDGajxagm9BytBo9jDah59CraA/ajz5DxzDA6BgHM8RsMC7Gw0KxOCwJk2PLsSKsDKvGGrBWrAO7ifVjz7F3BBKBRcAJNgR3QiBhHkFIWExYTthIqCAcJDQR2gk3CQOEUcInIpOoS7QmuhH5xBhiMjGHWEgsI9YSjxMvEHuIQ8Q3JBKJQzInuZACSbGkVNIS0kbSblIj6SypmzRIGiOTydpka7IHOZQsICvIheSd5MPkM+Qb5CHyWwqdYkBxpPhT4ihSympKGeUQ5TTlBmWYMkFVo5pS3aihVBE1j1pCraG2Uq9Rh6gTNHWaOc2DFklLpa2ildMaaBdo92mv6HS6Ed2VHk6X0FfSy+lH6JfoA/R3DA2GFYPHiGcoGZsYBxhnGXcYr5hMphnTixnHVDA3MeuY55kPmW9VWCq2KnwVkcoKlUqVJpUbKi9Uqaqmqt6qC1XzVctUj6leU32uRlUzU+OpCdSWq1WqnVDrUxtTZ6k7qIeqZ6hvVD+kfln9iQZZw0zDT0OkUaCxX+O8xiALYxmzeCwhaw2rhnWBNcQmsc3ZfHYqu5j9HbuLPaqpoTlDM0ozV7NS85RmPwfjmHH4nHROCecop5fzforeFO8p4ikbpjRMuTFlXGuqlpeWWKtIq1GrR+u9Nq7tp52mvUW7WfuBDkHHSidcJ0dnj84FnedT2VPdpwqnFk09OvWuLqprpRuhu0R3v26n7pievl6Ankxvp955vef6HH0v/VT9bfqn9UcMWAazDCQG2wzOGDzFNXFvPB0vx9vxUUNdw0BDpWGVYZfhhJG50Tyj1UaNRg+MacZc4yTjbcZtxqMmBiYhJktN6k3umlJNuaYppjtMO0zHzczNos3WmTWbPTHXMueb55vXm9+3YFp4Wiy2qLa4ZUmy5FqmWe62vG6FWjlZpVhVWl2zRq2drSXWu627pxGnuU6TTque1mfDsPG2ybaptxmw5dgG2662bbZ9YWdiF2e3xa7D7pO9k326fY39PQcNh9kOqx1aHX5ztHIUOlY63prOnO4/fcX0lukvZ1jPEM/YM+O2E8spxGmdU5vTR2cXZ7lzg/OIi4lLgssulz4umxvG3ci95Ep09XFd4XrS9Z2bs5vC7ajbr+427mnuh9yfzDSfKZ5ZM3PQw8hD4FHl0T8Ln5Uwa9+sfk9DT4FntecjL2MvkVet17C3pXeq92HvFz72PnKf4z7jPDfeMt5ZX8w3wLfIt8tPw2+eX4XfQ38j/2T/ev/RAKeAJQFnA4mBQYFbAvv4enwhv44/Ottl9rLZ7UGMoLlBFUGPgq2C5cGtIWjI7JCtIffnmM6RzmkOhVB+6NbQB2HmYYvDfgwnhYeFV4Y/jnCIWBrRMZc1d9HcQ3PfRPpElkTem2cxTzmvLUo1Kj6qLmo82je6NLo/xi5mWczVWJ1YSWxLHDkuKq42bmy+3/zt84fineIL43sXmC/IXXB5oc7C9IWnFqkuEiw6lkBMiE44lPBBECqoFowl8hN3JY4KecIdwmciL9E20YjYQ1wqHk7ySCpNepLskbw1eSTFM6Us5bmEJ6mQvEwNTN2bOp4WmnYgbTI9Or0xg5KRkHFCqiFNk7Zn6mfmZnbLrGWFsv7Fbou3Lx6VB8lrs5CsBVktCrZCpuhUWijXKgeyZ2VXZr/Nico5lqueK83tzLPK25A3nO+f/+0SwhLhkralhktXLR1Y5r2sajmyPHF52wrjFQUrhlYGrDy4irYqbdVPq+1Xl65+vSZ6TWuBXsHKgsG1AWvrC1UK5YV969zX7V1PWC9Z37Vh+oadGz4ViYquFNsXlxV/2CjceOUbh2/Kv5nclLSpq8S5ZM9m0mbp5t4tnlsOlqqX5pcObg3Z2rQN31a07fX2Rdsvl80o27uDtkO5o788uLxlp8nOzTs/VKRU9FT6VDbu0t21Ydf4btHuG3u89jTs1dtbvPf9Psm+21UBVU3VZtVl+0n7s/c/romq6fiW+21drU5tce3HA9ID/QcjDrbXudTVHdI9VFKP1ivrRw7HH77+ne93LQ02DVWNnMbiI3BEeeTp9wnf9x4NOtp2jHus4QfTH3YdZx0vakKa8ppGm1Oa+1tiW7pPzD7R1ureevxH2x8PnDQ8WXlK81TJadrpgtOTZ/LPjJ2VnX1+LvncYNuitnvnY87fag9v77oQdOHSRf+L5zu8O85c8rh08rLb5RNXuFearzpfbep06jz+k9NPx7ucu5quuVxrue56vbV7ZvfpG543zt30vXnxFv/W1Z45Pd2983pv98X39d8W3X5yJ/3Oy7vZdyfurbxPvF/0QO1B2UPdh9U/W/7c2O/cf2rAd6Dz0dxH9waFg8/+kfWPD0MFj5mPy4YNhuueOD45OeI/cv3p/KdDz2TPJp4X/qL+y64XFi9++NXr187RmNGhl/KXk79tfKX96sDrGa/bxsLGHr7JeDMxXvRW++3Bd9x3He+j3w9P5Hwgfyj/aPmx9VPQp/uTGZOT/wQDmPP8YzMt2wAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAABBUlEQVR42mL8v4OBJMAEZ/0nTgMLnLXtitKRO9JmCi9cNR/wsP8mrOHfP8YbL4RvvBBWFXuvI/WGsJMYSHUSMujbY8LN/ttM4bmO1BtW5n+ENdipPmndbrHjqiIn6x9DuZc2yk8tlZ7hc5Kx/AtzxecMDAzff7Mcuys9/7gOAT8wMjAUOZ9x0XhI2A98HL+Eub/vuSG/8ozGmy+cEEF+zp/YNYjxfvPTv9O63fLpBx6ICCvz32DD24EGt7Fo4Gb/zcX2Z84RPbiIqfyLZJtL4rzfsDvJUf3R91+sC09o//7LJMn/NdXmkqHsSyzeQ0t8j9/znn8s7ql9Dy34cWogIbUSCQADAJ+jWQrH9LCsAAAAAElFTkSuQmCCiVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAACW0lEQVR4nGP8v5OBpoCJtsbTwQIWTKGUxe5mCi9M5V/oSL9mZf5HoQWMmHEQOD0AwuBg/WMo+8pB/ZGZwguyLcDiAzj48Zvl+D2pTz/YKLGAcBxcfSZCtulEWUAhGDQW3HstcOOF8P//jKRagC+SkQE/58/0pa7c7L9N5V+aKTw3kH3FxvKXmhYI83y3VXl64Jbs3htye2/IsbH8NZB9Zabw3FT+JR/nTypYwMDAEGBw+8AtWQj71x/mU/clT92XZGT8ry7+zlzxhbnic0n+LxRZIC/8yUju5blH4siC//8z3nghfOOF8MLj2jKCnydH7EXTRVoqCjC4g0f2yXteTEHSLNCVft0WcNhM4QXxiYmEIIIATcm3mpJvn37gmX7Q8OozYYLqycloTz/wLDulRYzpDMT4QFf6NZz95gvnyjMa+27I/SM6xxGwQJj7R6rtJQYGhk8/2NaeU9t+RfH3X2ZcihWEP5Fmgazg53qfY9zsv1ed0dh4UeXbL5yKudl/R5tdd9O6T4IFGhJvyz1OHbkts/qc2qfv7LiUMTIwOGk8irW4yo8jP2O3wEzxubHcy7I1Dq+/cOIymoGBQVn0Q5rtRTXx93jUYLFAX+b1sw88p+5L4tHGy/Er2uy6m9YDRsb/eJRht8BS+emCY7q4NDAyMLhpPYixuMbD/gu/0VD1WBtezz7w9O81vvNKEE1cTfxdmu0lZdEPxBiNzwIGBoa//xhXndFYfU4NUsnwcf6Ms7jmpPGQ1BoHpwUQcOOF0OT9RoayryJNr3Oz/ybRcCIsoBwMmkp/8FoAADmgy6ulKggYAAAAAElFTkSuQmCC",
        "code": 5,
        "searchForm": "https://www.bing.com/search?q=&pc=MOZI"
    },
    {
        "name": "Amazon.com",
        "alias": "amazon",
        "icon": "data:image/x-icon;base64,AAABAAIAEBAAAAAAAAC0AQAAJgAAACAgAAAAAAAA6QIAANoBAACJUE5HDQoaCgAAAA1JSERSAAAAEAAAABAIBgAAAB/z/2EAAAF7SURBVDjLlZPLasJAFIaFRF+iVV+h6hO0GF+gVB9AaHwDt64qCG03tQgtdCFIuyhUelmGli66MXThSt24kNiFBUlAYi6ezjnNxSuawB/ITP7v/HNmJgQAEaZzpgHs/gwcTyTEXuXl2U6nA8ViEbK5HKler28CVRAwnB9ptVrAh8MrQuCaZ4iA8fzIqSgCxwzpTIaSuN/RWGwdYLwCUBQFZFkGSZLgqdmEE7YEN8VOAKyaSKUW4nNBAFmnYiKZpDRX1WqwBBzP089n5f/NEQsFL4WqqtsBWJlzDAJr5PwSMM1awEzzdxIbGI3Hvc6jCZeVFgRQRwpY7Qcw3ktgfpR8wLRxCPaot/X4GS95MppfF6DX9n2A3f+kAZycaT8bAZjU6r6B/duD6d3BYg9wQq/tkYzHY1blEiz5lmQyGc95mrO6r2CxgpjCBXgNsJVviolpXJiraeOIjJRE10juUa4sR8V+mO17VvmGqtuOcdNlwut8zTQJcJ0njifyB2bgTdKh6w4BAAAAAElFTkSuQmCCiVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACsElEQVRYw71XQWsTURBe2LQgeNKLB+tVemt6txcteNSD/QGC6VEIGDx5s+eKPQqFgJhLNdFLBWMP7cU0oSAWjB70koC9WHbVQ5SO8+XtS14mr7svyaYDH9m87Jv55puZt1nPi4yIzjMeMj7T9OwjI88455nGC1cZX+nsDESumJmPFDwIAqrX6z00Gg1qt9vjkJgFgUeuO16Vy3RjeZkyMzM9+MY1fsM9I9h9zyV7ZAznZrA4FAoFVwJ1z+WuOysrg1lnMolkHJX4k0igzI5sARYWF7vEZEk0rvO6iyUSuJfLJUqM7zYSqRDIra4OOUZPmNZsNrsl8UVTpkJAjh1GzmaSpJ8mAWmYeZB5urHRhW5SNOfUCCDo47W1bvPZsp2qAhipy3Nz1kaLG8dUCEBqM5AvpgElqFar01NgIZsdco7Zb7VasU2YigIYL5tjqCL7Q5YkFQXKlcqQ7DbHthIALk/IWAKor82xPIhshxWABCYioDMz51sexcVi0XoG4DPLIyvJjkTArK3scDQnRvO0MdTrUHGiKZCP4tNgO6BAEI08EQH9Z2Qow0hyPypJGIa9p6JWKCn4SA8jSKmJIDgyRvPJkcRxjfUwNGr/i8+Mo32iHzWiThBD4NM60bet9P77/ubA728RlTjMiwiH6zEEfvIrwdZFtQmMJ7W/ofIDBZD5m3mVZGwJcOP2kmILIlCkE45HoPWurwCSg0+UQRD4ZyXxId+T7gQb9+4q9sioY5ltrOG3L5vqXiiJffDx/aUi83ZJ7jr2ohcEu8Hh6/m+I7OWGiVxbWKHsz+O3vSOakqFQdsFgQeJUiKD7Wv9YKXBgCeSUC3v2kM5EJhlHDh3NcgcPlG1BXZu98sDmTuBa4fsMnz9fniJUaGzs+eMC540XuR0aDO2L8Y3qPyMcdOM+R/8XcqRA3qp9gAAAABJRU5ErkJggg==",
        "code": 7,
        "searchForm": "http://www.amazon.com/exec/obidos/external-search/?field-keywords=&mode=blended&tag=mozilla-20&sourceid=Mozilla-search"
    },
    {
        "name": "YouTube Video Search",
        "alias": "#yt",
        "icon": "data:image/gif;base64,R0lGODlhEgANAOMKAAAAABUVFRoaGisrKzk5OUxMTGRkZLS0tM/Pz9/f3////////////////////////yH5BAEKAA8ALAAAAAASAA0AAART8Ml5Arg3nMkluQIhXMRUYNiwSceAnYAwAkOCGISBJC4mSKMDwpJBHFC/h+xhQAEMSuSo9EFRnSCmEzrDComAgBGbsuF0PHJq9WipnYJB9/UmFyIAOw==",
        "code": 1,
        "searchForm": "http://www.google.de"
    }
];

CLIQZEnvironment = {
    log: function(msg, key){ console.log(key, msg) },
    getSearchEngines: function() {
        CLIQZEnvironment.log("test", "test")
        return ENGINES.map(function(e){
            e.getSubmissionForQuery = function(q){
                //TODO: create the correct search URL
                return e.searchForm;
            }

            return e
        });
    },
    updateAlias: function(name, newAlias) {
      for(var engine in ENGINES) {
        console.log(engine)
        if(ENGINES[engine].name === name) {
          ENGINES[engine].alias = newAlias;
        }
      }
    }
}
