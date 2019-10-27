import numpy as np
import cv2
import pyzbar.pyzbar as pyzbar
import imutils
import requests
import time
cap = cv2.VideoCapture('/dev/video6')
#v4l2-ctl --list-devices

def on_connect(client, userdata, flags, rc):
    print("Connected with result code "+str(rc))
    client.subscribe("qrr")

# The callback for when a PUBLISH message is received from the server.
def on_message(client, userdata, msg):
    print(msg.topic+" "+str(msg.payload))


frame_rate = 10
prev = 0

Kernel_size=15
low_threshold=40
high_threshold=120


#client.loop_forever()

while(cap.isOpened()):

    ret, frame = cap.read()
   
    if ret==True:
        frame = cv2.flip(frame,-1)
        frame = cv2.bitwise_not(frame)
        #frame = imutils.resize(frame, width=400)
        decodedObjects = pyzbar.decode(frame)
        text = ""
        for barcode in decodedObjects:
	        (x, y, w, h) = barcode.rect
	        cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 255, 255), -1)
            
	        barcodeData = barcode.data.decode("utf-8")
	        barcodeType = barcode.type
	        text = "{}".format(barcodeData)
            
            #last_qr = text
	        #cv2.putText(frame, text, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX,0.5, (255, 255, 255), 2)

           
        if(text != ""):
            print(text)
            try:
                r = requests.get('http://127.0.0.1:3016/rest/got_qr/'+text)
                time.sleep(1)
                
            except:
                print(".")
                pass
            text = ""
            

        line_frame = frame.copy()   
        #line_frame = cv2.cvtColor(line_frame, cv2.COLOR_BGR2GRAY)
        #line_frame = cv2.GaussianBlur(line_frame,(7,7),0)
        #line_frame = cv2.Canny(line_frame, low_threshold, high_threshold)
        
        
        #cv2.imshow('frame',line_frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        #time.sleep(0.05)
    else:
        break

# Release everything if job is finished
cap.release()
cv2.destroyAllWindows()