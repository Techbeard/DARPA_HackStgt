#include <Arduino.h>
#include <FastLED.h>
#include <Servo.h>

//FastLED Stuff
#define NUM_LEDS 15
#define DATA_PIN 4
CRGB leds[NUM_LEDS];

//Platform Stuff
#define ENDSTOP_A 2
#define ENDSTOP_B 3
#define MOTOR_A1 5
#define MOTOR_A2 6
volatile bool stopA = false;
volatile bool stopB = false;
bool moveState = false;

//Serial Stuff
char buf[50] = {0};
byte bufIdx = 0;
bool newDataAvailable = false;

//Servo Stuff
#define LEFT_SERVO 7
#define RIGHT_SERVO 8
int openPos = 0;
int closedPos = 180;
Servo leftServo;
Servo rightServo;

//Stepper Stuff


void setup(){
    //Configure Serial
    Serial.begin(115200);
    Serial.println("DERPA");
    //delay(1000);

    //Fastled things
    FastLED.addLeds<WS2811, DATA_PIN, BRG>(leds, NUM_LEDS);

    //platform config and interrupts
    pinMode(ENDSTOP_A, INPUT);
    pinMode(ENDSTOP_B, INPUT);
    attachInterrupt(digitalPinToInterrupt(ENDSTOP_A), stopMotorA, RISING); //Back Endstop
    attachInterrupt(digitalPinToInterrupt(ENDSTOP_B), stopMotorB, RISING); //Front Endstop
    pinMode(MOTOR_A1, OUTPUT);
    pinMode(MOTOR_A2, OUTPUT);

    //servo stuff again
    leftServo.attach(7);
    leftServo.write(20);
    rightServo.attach(8);
    rightServo.write(0);
}

//ISR for Endpoints to stop the motor
void stopMotorA(){
    stopA = true;
    Serial.println("stopA");
    digitalWrite(MOTOR_A1, LOW); //stop the motor when it reached the endstop at point A
    digitalWrite(MOTOR_A2, LOW);
}
void stopMotorB(){
    stopB = true;
    Serial.println("stopB");
    digitalWrite(MOTOR_A1, LOW);
    digitalWrite(MOTOR_A2, LOW); //stop the motor when it reached the endstop at point B
}

//Write the leds!
void ledMap(uint32_t color, int ledcount){
    FastLED.clear();
    for (int i = 0; i <= ledcount; i++){
        leds[i] = color;
    }
}

//Open the Grabber
void openGrabber(){
    leftServo.write(0);
    rightServo.write(20);
}

//Close the Grabber
void closeGrabber(){
    leftServo.write(20);
    rightServo.write(0);
}

//Cycle the platform.
void powerMotor(int direction){
    Serial.println("motorPower");
    if(direction == 1){
        while(!stopA){ //platform must be at stopB 
            Serial.println("moving to B");
            digitalWrite(MOTOR_A1, HIGH);
            digitalWrite(MOTOR_A2, LOW);
            delay(200);
            stopB = false;
        }
        Serial.println("wrong direction, platform is at stopA already");
    } else if (direction == 2){
        while(!stopB){
            Serial.println("moving to A"); //platform must be stopA
            digitalWrite(MOTOR_A2,HIGH);
            digitalWrite(MOTOR_A1, LOW);
            delay(200);
            stopA = false;
        }
        Serial.println("wrong direction, platform is at stopB already");
    }
}

//Process incoming serial data
void processData(){
    if (newDataAvailable){ //check for new data
        newDataAvailable = false; 
        Serial.println(buf);

        uint32_t color;
        int led;
        int direction;
        int grabber;
        sscanf(buf, "%06lX,%d,%d,%d", &color, &led, &direction, &grabber); //dissect the buffer

        Serial.println(color);
        Serial.println(led);
        Serial.println(direction);
        Serial.println(grabber);

        //Write the leds
        ledMap(color, led);
        FastLED.show();

        if(direction > 0 || direction < 3){ //check if direction is in acceptable range
            powerMotor(direction);
        }

        if(grabber > 0 || grabber < 3){ //check if grabber is in acceptable range
            if(grabber == 1){
                openGrabber();
            } else if (grabber == 2){
                closeGrabber();
            }
        }

        bufIdx = 0;
        memset(buf, 0, sizeof(buf));
    }
}

void advanceStepper(){
    
}

void loop(){
    while(Serial.available() != 0x00){ //wait for Serial connection
        char c = Serial.read();
        if(c == '\n'){ //wait for newline char for complete data set
            newDataAvailable = true;
        } else{
            buf[bufIdx] = c;
            bufIdx++;
        }
        processData();
        advanceStepper();
    }
}

//Default testing command: 
//FFFFFF,15,1,1 raise platform and close grabber
//AAFF22,15,2,2 lower platform and open grabber