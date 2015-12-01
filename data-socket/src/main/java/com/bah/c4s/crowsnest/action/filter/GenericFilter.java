package com.bah.c4s.crowsnest.action.filter;

import org.json.simple.JSONObject;

import com.bah.c4s.crowsnest.action.ActionResponse;

public class GenericFilter extends Filter {
	
	public GenericFilter(JSONObject actionDefinition) throws Exception{
		super(actionDefinition);
	}
	
	@Override
	public ActionResponse process(JSONObject json, String dataSource) {
		return this.type;
	}

	@Override
	public String getEntity() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public String getEntityDescription() {
		// TODO Auto-generated method stub
		return null;
	}
}
