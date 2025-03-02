Follow the template
the date must be in dd-mm-yyyy or dd/mm/yyyy or dd.mm.yyyy (day and month and be one digit, year can be two digit)

Date  
Location  
Name  
Order  
  

for example, you can refer below

Date 23/2/2025
Location PT
Name The Great Hotpot Order
Order pork shoulder - 1 block
shrimp- 600g
Tofu -400g
  
  
  
---------------------
INSTALLATION
---------------------
1. npm install - to install all libraries and dependencies
2. download nvm and use node ver minimum 22 (23 also can)
3. import order sql into mysql workbench
4. run start.bat to start website  
  
  
  
-----------------------
Whatsapp Format Message
-----------------------
  
Example of whatsapp message format css selector (2/3/2025)
![alt text](images/image2.png)

<div class="copyable-text" data-pre-plain-text="[11:18, 01/03/2025] Nick Yeoh: ">
    <div class="_akbu">
        <span dir="ltr" class="_ao3e selectable-text copyable-text" style="min-height: 0px;">
            <span class="x1lliihq">Date 1/4/2025</span>
            <span class="x1lliihq">Location BW</span>
            <span class="x1lliihq">Name test </span>
            <span class="x1lliihq">Order</span>
            <span class="">
                <ol class="x13faqbe xeaf4i8 x1n2onr6 xua7rxp x1gslohp x12nagc xmn8rco" dir="ltr">
                    <li dir="auto" value="1" class="x1h0ha7o"><span class="_ao3e selectable-text copyable-text" data-pre-plain-text="1. ">正排 2公斤 <strong class="_ao3e selectable-text copyable-text" data-app-text-template="*${appText}*">54片</strong> 煮 x 1包</span></li>
                    <li dir="auto" value="2" class="x1h0ha7o"><span class="_ao3e selectable-text copyable-text" data-pre-plain-text="2. ">肉头 1公斤 <strong class="_ao3e selectable-text copyable-text" data-app-text-template="*${appText}*">起筋 切6片</strong> x 2包</span></li>
                    <li dir="auto" value="3" class="x1h0ha7o"><span class="_ao3e selectable-text copyable-text" data-pre-plain-text="3. ">test</span></li>
                </ol>
            </span>
        </span>
    </div>
</div>


![alt text](images/image.png)


span._ao3e span:not(:has(ol)) - to capture the normal span message (date,location,name,order)
span[data-pre-plain-text] - to capture numbering formatted message in whatsapp

  
    
For normal plain message   

![alt text](images/image3.png)

<div class="copyable-text" data-pre-plain-text="[09:52, 01/03/2025] Nick Yeoh: ">
    <div class="_akbu">
        <span dir="ltr" class="_ao3e selectable-text copyable-text" style="min-height: 0px;">
            <span class="x1lliihq">Date 01/04/25</span>
            <span class="x1lliihq">Location BW</span>
            <span class="x1lliihq">Name Thaiway</span>
            <span class="x1lliihq">Order</span>
            <span class="">Shabu belly slice 2kg - 3box</span>
        </span>
        <span class="">
            <span class="x3nfvp2 xxymvpz xlshs6z xqtp20y xexx8yu x150jy0e x18d9i69 x1e558r4 x12lo8hy x152skdk" aria-hidden="true">
                <span class="x1c4vz4f x2lah0s xn6xy2s"></span>
                <span class="x1c4vz4f x2lah0s">09:52</span>
            </span>
        </span>
    </div>
</div>

span._ao3e span:not(:has(ol)) - will already capture all of the messages