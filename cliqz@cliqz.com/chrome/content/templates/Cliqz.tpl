{{#with data}}
<div class="cqz-result-h2 nopadding">
    
    <div class="helpfulcontent">
        
        <div class="EZ-Cliqz-Header" style="background-image: url({{cliqz_logo}})">
            {{#each social_contact}}
                <img  url="{{url}}" class="EZ-Cliqz_Header-Contact-icon" src="{{logo}}" arrow-override=''/>
            {{/each}}
        </div>
        
        <div class="EZ-Cliqz-Footer">
            <div class="cqz-ez-btn big" style="background-color:{{Common_Questions.color}}"  url="{{Common_Questions.url}}">
                {{local 'cliqz_common_questions'}}
            </div>
            <div class="cqz-ez-btn big" style="background-color:{{Give_Feedback.color}}"  url="{{Give_Feedback.url}}">
                {{local 'cliqz_give_feedback'}}
            </div>
            <div class="cqz-ez-btn" style="background-color:{{About_Us.color}}"  url="{{About_Us.url}}">
                {{local 'cliqz_about_us'}}
            </div>
            <div class="cqz-ez-btn" style="background-color:{{Jobs.color}}"  url="{{Jobs.url}}">
                {{local 'cliqz_jobs'}}
            </div>
            <div class="cqz-ez-btn" style="background-color:{{Privacy.color}}"  url="{{Privacy.url}}">
                {{local 'cliqz_privacy'}}
            </div>
        </div>
        
    </div>
    
    <div class="explanation">
        <div class="inner">
            <h3 class="explanation__title">
                {{local 'cliqz_whatiscliqz_title'}}
            </h3>
            <div class="explanation__description">
                {{local 'cliqz_whatiscliqz_text'}}
            </div>
            <a href="http://www.cliqz.com" class="explanation__link">
                {{local 'cliqz_whatiscliqz_link'}}
            </a>
        </div>
    </div>
 
    <div class="explanation">
        <div class="inner">
            <h3 class="explanation__title">
                {{local 'cliqz_individual_title'}}
            </h3>
            <div class="explanation__description">
                {{local 'cliqz_individual_text'}}
            </div>
            <a href="#" class="explanation__link">
                {{local 'cliqz_individual_link'}}
            </a>
        </div>
    </div>
    <div class="explanation">
        <div class="inner">
            <h3 class="explanation__title">
                {{local 'cliqz_safe_title'}}
            </h3>
            <div class="explanation__description">
                {{local 'cliqz_safe_text'}}
            </div>
            <a href="#" class="explanation__link">
                {{local 'cliqz_safe_link'}}
            </a>
        </div>
    </div>

    
</div>
{{/with}}
