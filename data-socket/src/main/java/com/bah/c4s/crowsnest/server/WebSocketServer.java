package com.bah.c4s.crowsnest.server;

import org.glassfish.tyrus.server.Server;
 
public class WebSocketServer {
 
    public static void main(String[] args) {
        runServer();
    }
 
    public static void runServer() {
        Server server = new Server("0.0.0.0", 50031, "/data", DataInterfaceServer.class);
 
        try {
            server.start();
            while(true){
            	Thread.sleep(1_000_000L);
            }
            
        } catch (Exception e) {
            throw new RuntimeException(e);
        } finally {
            server.stop();
        }
    }
}