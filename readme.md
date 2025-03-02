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
Whatsapp Format Message (2/3/2025)
-----------------------

For numbering formatted message  
![alt text](images/image2.png)  
![alt text](images/image4.png)
  
  
  
For normal plain message   

![alt text](images/image3.png)  
![alt text](images/image5.png)  


-----------------------
Coding Logic
-----------------------
  
![alt text](images/image.png)
  
    
For numbering formatted message    
![alt text](images/image4.png)    
span._ao3e span:not(:has(ol)) - to capture the normal span message (date,location,name,order)  
span[data-pre-plain-text] - to capture numbering formatted message in whatsapp  
   
  
For normal plain message   
![alt text](images/image5.png)    
span._ao3e span:not(:has(ol)) - will already capture all of the messages  